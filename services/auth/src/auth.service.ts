import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'crypto';
import { readConfig } from '@yemesek/config';
import { PrismaService } from '@yemesek/database';
import { EvidenceService } from '@yemesek/evidence';
import { MailService } from '@yemesek/mail';
import { ModerationService } from '@yemesek/moderation';
import { SettingsService } from '@yemesek/settings';
import { MemoryRateLimiter } from '@yemesek/shared';
import { assertHuman } from './captcha';
import type { AuthSession, MfaChallenge, PublicBadge, PublicUser } from './auth.types';
import { openSecret, randomBase32, sealSecret, totpMatches } from './totp';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function assertPassword(password: string): void {
  if (Buffer.byteLength(password) > 72) {
    throw new BadRequestException({ message: ['Parola çok uzun.'] });
  }
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) {
    throw new BadRequestException({ message: ['Parola en az bir harf ve bir rakam içermeli.'] });
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly dummyHash = bcrypt.hashSync('not-a-real-user', 12);
  private readonly resendLimiter = new MemoryRateLimiter(3, 10 * 60_000);
  private readonly loginFailures = new MemoryRateLimiter(8, 10 * 60_000);
  private readonly verifyFailures = new MemoryRateLimiter(5, 10 * 60_000);
  private readonly resetSends = new MemoryRateLimiter(3, 10 * 60_000);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly moderation: ModerationService,
    private readonly evidence: EvidenceService,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSession> {
    await assertHuman(dto);
    if (!(await this.settings.registrationOpen())) {
      throw new ForbiddenException('Yeni kayıtlar kapalı.');
    }
    assertPassword(dto.password);
    const issues = this.moderation.collect([{ value: dto.displayName }]);
    if (issues.length) throw new BadRequestException({ message: issues });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const now = new Date();
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          kvkkAcceptedAt: now,
          termsAcceptedAt: now,
          marketingAcceptedAt: dto.acceptMarketing ? now : null,
          ageConfirmedAt: now,
        },
      });
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Bu e-posta ile kayıt var.');
      }
      throw error;
    }

    try {
      await this.sendVerification(user);
    } catch (error) {
      await this.prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Doğrulama e-postası gönderilemedi. Biraz sonra tekrar dene.');
    }
    return this.issue(user);
  }

  async login(dto: LoginDto): Promise<AuthSession | MfaChallenge> {
    await assertHuman(dto);
    const email = dto.email.trim().toLowerCase();
    const failureKey = `login:${email}`;
    if (this.loginFailures.blocked(failureKey)) {
      throw new HttpException('Çok fazla hatalı giriş. On dakika sonra tekrar dene.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? this.dummyHash);
    if (!user || !ok || user.deletedAt) {
      this.loginFailures.allow(failureKey);
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }
    this.loginFailures.clear(failureKey);
    if (user.disabledAt) throw new ForbiddenException('Bu hesap askıya alındı.');
    if (user.totpEnabledAt && user.totpSecret) {
      const secret = readConfig().jwtAccessSecret;
      const mfaToken = await this.jwt.signAsync(
        { sub: user.id, purpose: 'mfa' },
        { secret, expiresIn: '5m', algorithm: 'HS256' },
      );
      return { mfaRequired: true, mfaToken };
    }
    return this.issue(user);
  }

  async refresh(dto: RefreshDto): Promise<AuthSession> {
    const tokenHash = hashToken(dto.refreshToken);
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!row || row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Oturum yenilenemedi.');
    }
    if (row.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Oturum yenilenemedi.');
    }
    const consumed = await this.prisma.refreshToken.updateMany({
      where: { id: row.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (consumed.count !== 1) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Oturum yenilenemedi.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: row.userId } });
    if (!user || user.deletedAt) throw new UnauthorizedException('Oturum yenilenemedi.');
    return this.issue(user);
  }

  async logout(dto: RefreshDto): Promise<{ ok: true }> {
    const tokenHash = hashToken(dto.refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async exportMine(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new UnauthorizedException('Giriş gerekli.');
    const [restaurants, reports, votes, badges] = await Promise.all([
      this.prisma.restaurant.findMany({
        where: { createdById: userId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, city: true, district: true, status: true, createdAt: true },
      }),
      this.prisma.report.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          title: true,
          body: true,
          category: true,
          severity: true,
          nickname: true,
          hidden: true,
          withdrawnAt: true,
          createdAt: true,
          restaurant: { select: { id: true, name: true, city: true } },
        },
      }),
      this.prisma.vote.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { reportId: true, createdAt: true },
      }),
      this.prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { awardedAt: 'asc' },
      }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
        kvkkAcceptedAt: user.kvkkAcceptedAt.toISOString(),
        termsAcceptedAt: user.termsAcceptedAt.toISOString(),
        marketingAcceptedAt: user.marketingAcceptedAt?.toISOString() ?? null,
        marketingWithdrawnAt: user.marketingWithdrawnAt?.toISOString() ?? null,
        ageConfirmedAt: user.ageConfirmedAt?.toISOString() ?? null,
      },
      consents: {
        kvkkAcceptedAt: user.kvkkAcceptedAt.toISOString(),
        termsAcceptedAt: user.termsAcceptedAt.toISOString(),
        marketingAcceptedAt: user.marketingAcceptedAt?.toISOString() ?? null,
        marketingWithdrawnAt: user.marketingWithdrawnAt?.toISOString() ?? null,
      },
      restaurants: restaurants.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
      reports: reports.map((row) => ({
        ...row,
        createdAt: row.createdAt.toISOString(),
        withdrawnAt: row.withdrawnAt?.toISOString() ?? null,
      })),
      votes: votes.map((row) => ({ reportId: row.reportId, createdAt: row.createdAt.toISOString() })),
      badges: badges.map((row) => ({
        slug: row.badge.slug,
        name: row.badge.name,
        awardedAt: row.awardedAt.toISOString(),
        revokedAt: row.revokedAt?.toISOString() ?? null,
      })),
    };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Giriş gerekli.');
    return this.toPublicUser(user);
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    if (dto.displayName) {
      const issues = this.moderation.collect([{ value: dto.displayName }]);
      if (issues.length) throw new BadRequestException({ message: issues });
    }
    const current = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw new UnauthorizedException('Giriş gerekli.');

    let marketingAcceptedAt = current.marketingAcceptedAt;
    let marketingWithdrawnAt = current.marketingWithdrawnAt;
    if (dto.acceptMarketing === true && !current.marketingAcceptedAt) marketingAcceptedAt = new Date();
    if (dto.acceptMarketing === false && current.marketingAcceptedAt) {
      marketingAcceptedAt = null;
      marketingWithdrawnAt = new Date();
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName ?? current.displayName,
        marketingAcceptedAt,
        marketingWithdrawnAt,
      },
    });
    return this.toPublicUser(user);
  }

  async remove(userId: string, dto: DeleteAccountDto): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new UnauthorizedException('Giriş gerekli.');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Parola hatalı.');
    const days = await this.settings.number('evidenceRetentionDays');
    const now = new Date();
    const purgeAfter = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    await this.prisma.report.updateMany({
      where: { authorId: userId, evidencePurgeAfter: null },
      data: { evidencePurgeAfter: purgeAfter },
    });
    await this.revokeSessions(userId);
    await this.prisma.emailVerification.deleteMany({ where: { userId } });
    await this.prisma.passwordReset.deleteMany({ where: { userId } });
    await this.prisma.recoveryCode.deleteMany({ where: { userId } });
    await this.prisma.pushToken.deleteMany({ where: { userId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `silindi-${userId}@deleted.local`,
        displayName: 'Silinmiş kullanıcı',
        passwordHash: await bcrypt.hash(randomBytes(24).toString('hex'), 4),
        disabledAt: now,
        deletedAt: now,
        totpSecret: null,
        totpEnabledAt: null,
        marketingAcceptedAt: null,
      },
    });
    return { ok: true };
  }

  async revokeSessions(userId: string): Promise<{ ok: true }> {
    const now = new Date();
    await this.prisma.user.update({ where: { id: userId }, data: { sessionsRevokedAt: now } });
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
    return { ok: true };
  }

  async requestPasswordReset(email: string, human: { company?: string; captchaToken?: string }): Promise<{ ok: true }> {
    await assertHuman(human);
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    const normalized = email.trim().toLowerCase();
    if (!this.resetSends.allow(`reset:${normalized}`)) return { ok: true };
    if (!user || user.deletedAt || user.disabledAt) return { ok: true };
    const config = readConfig();
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + config.emailVerificationTtlMinutes * 60_000);
    await this.prisma.passwordReset.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.passwordReset.create({
      data: { userId: user.id, tokenHash: hashToken(token), expiresAt },
    });
    const resetUrl = `${config.appPublicUrl}/sifre-sifirla?token=${encodeURIComponent(token)}`;
    await this.mail.send('password_reset', user.email, { displayName: user.displayName, resetUrl });
    return { ok: true };
  }

  async confirmPasswordReset(token: string, password: string): Promise<{ ok: true }> {
    assertPassword(password);
    const row = await this.prisma.passwordReset.findFirst({
      where: { tokenHash: hashToken(token), consumedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!row) throw new BadRequestException('Bağlantı hatalı veya süresi dolmuş.');
    await this.prisma.passwordReset.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
    const account = await this.prisma.user.findUnique({ where: { id: row.userId } });
    if (!account || account.deletedAt || account.disabledAt) {
      throw new BadRequestException('Bağlantı hatalı veya süresi dolmuş.');
    }
    await this.prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: await bcrypt.hash(password, 12) },
    });
    await this.revokeSessions(row.userId);
    return { ok: true };
  }

  async setupTotp(userId: string): Promise<{ otpauthUrl: string; secret: string; recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Giriş gerekli.');
    if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') {
      throw new ForbiddenException('İki adımlı doğrulama görevliler içindir.');
    }
    const secret = randomBase32();
    const recoveryCodes = Array.from({ length: 8 }, () => randomBytes(5).toString('hex'));
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: sealSecret(secret), totpEnabledAt: null },
    });
    await this.prisma.recoveryCode.deleteMany({ where: { userId } });
    await this.prisma.recoveryCode.createMany({
      data: recoveryCodes.map((code) => ({ userId, codeHash: hashToken(code) })),
    });
    const label = encodeURIComponent(user.email);
    return {
      secret,
      recoveryCodes,
      otpauthUrl: `otpauth://totp/Yemesek:${label}?secret=${secret}&issuer=Yemesek&digits=6&period=30`,
    };
  }

  async confirmTotp(userId: string, code: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecret) throw new BadRequestException('Önce kurulumu başlat.');
    if (!totpMatches(openSecret(user.totpSecret), code)) {
      throw new BadRequestException('Kod hatalı.');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { totpEnabledAt: new Date() } });
    return { ok: true };
  }

  async challengeMfa(mfaToken: string, code?: string, recoveryCode?: string): Promise<AuthSession> {
    const secret = readConfig().jwtAccessSecret;
    let payload: { sub?: string; purpose?: string };
    try {
      payload = await this.jwt.verifyAsync(mfaToken, { secret, algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException('Doğrulama süresi doldu.');
    }
    if (payload.purpose !== 'mfa' || !payload.sub) throw new UnauthorizedException('Doğrulama süresi doldu.');
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.totpSecret || !user.totpEnabledAt) throw new UnauthorizedException('Doğrulama kapalı.');
    if (code && totpMatches(openSecret(user.totpSecret), code)) return this.issue(user);
    if (recoveryCode) {
      const row = await this.prisma.recoveryCode.findUnique({ where: { codeHash: hashToken(recoveryCode.trim()) } });
      if (row && row.userId === user.id && !row.usedAt) {
        await this.prisma.recoveryCode.update({ where: { id: row.id }, data: { usedAt: new Date() } });
        return this.issue(user);
      }
    }
    throw new UnauthorizedException('Kod hatalı.');
  }

  async myReports(userId: string) {
    const reports = await this.prisma.report.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: 'desc' },
      include: { restaurant: { select: { id: true, name: true, city: true } } },
    });
    return reports.map((report) => ({
      id: report.id,
      title: report.title,
      category: report.category,
      severity: report.severity,
      createdAt: report.createdAt.toISOString(),
      restaurant: report.restaurant,
    }));
  }

  async verifyCode(userId: string, code: string): Promise<PublicUser> {
    const key = `verify:${userId}`;
    if (this.verifyFailures.blocked(key)) {
      await this.burnVerificationCodes(userId);
      throw new HttpException('Çok fazla hatalı kod. Yeni doğrulama e-postası iste.', HttpStatus.TOO_MANY_REQUESTS);
    }
    try {
      const user = await this.consumeVerification({ userId, codeHash: hashToken(code) });
      this.verifyFailures.clear(key);
      return this.toPublicUser(user);
    } catch (error) {
      this.verifyFailures.allow(key);
      if (this.verifyFailures.blocked(key)) {
        await this.burnVerificationCodes(userId);
        throw new HttpException('Çok fazla hatalı kod. Yeni doğrulama e-postası iste.', HttpStatus.TOO_MANY_REQUESTS);
      }
      throw error;
    }
  }

  async verifyLink(token: string): Promise<{ ok: true }> {
    await this.consumeVerification({ tokenHash: hashToken(token) });
    return { ok: true };
  }

  async resend(userId: string): Promise<{ ok: true }> {
    if (process.env.NODE_ENV !== 'test' && !this.resendLimiter.allow(`resend:${userId}`)) {
      throw new HttpException(
        'Doğrulama e-postası çok sık istendi. Biraz sonra tekrar dene.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Giriş gerekli.');
    if (user.emailVerifiedAt) throw new BadRequestException('E-posta zaten doğrulanmış.');
    await this.sendVerification(user);
    return { ok: true };
  }

  devHint(email: string) {
    const config = readConfig();
    if (config.isProduction || config.brevoApiKey) throw new NotFoundException();
    const hint = this.mail.devHint(email);
    if (!hint) throw new NotFoundException('Doğrulama kaydı yok.');
    return hint;
  }

  async savePushToken(userId: string, token: string, platform: string): Promise<{ ok: true }> {
    const clean = token.trim();
    if (clean.length < 8 || clean.length > 200) throw new BadRequestException('Jeton geçersiz.');
    const name = platform.trim().slice(0, 20) || 'unknown';
    await this.prisma.pushToken.upsert({
      where: { token: clean },
      update: { userId, platform: name },
      create: { userId, token: clean, platform: name },
    });
    if (!process.env.EXPO_ACCESS_TOKEN) {
      console.info(`[push:noop] registered user=${userId}`);
    }
    return { ok: true };
  }

  private async sendVerification(user: User): Promise<void> {
    const config = readConfig();
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + config.emailVerificationTtlMinutes * 60_000);
    await this.prisma.emailVerification.updateMany({
      where: { userId: user.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        codeHash: hashToken(code),
        tokenHash: hashToken(token),
        expiresAt,
      },
    });
    const verifyUrl = `${config.appPublicUrl}/dogrula?token=${encodeURIComponent(token)}`;
    await this.mail.send('email_verification', user.email, {
      displayName: user.displayName,
      code,
      verifyUrl,
    });
  }

  private async consumeVerification(where: { userId?: string; codeHash?: string; tokenHash?: string }): Promise<User> {
    const row = await this.prisma.emailVerification.findFirst({
      where: {
        userId: where.userId,
        codeHash: where.codeHash,
        tokenHash: where.tokenHash,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    if (!row) throw new BadRequestException('Kod hatalı veya süresi dolmuş.');
    await this.prisma.emailVerification.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
    const user = row.user.emailVerifiedAt
      ? row.user
      : await this.prisma.user.update({
          where: { id: row.userId },
          data: { emailVerifiedAt: new Date() },
        });
    if (!row.user.emailVerifiedAt) {
      try {
        await this.mail.send('welcome', user.email, { displayName: user.displayName });
      } catch {
        console.error('[mail] welcome failed');
      }
    }
    return user;
  }

  private async burnVerificationCodes(userId: string): Promise<void> {
    await this.prisma.emailVerification.updateMany({
      where: { userId, consumedAt: null },
      data: { consumedAt: new Date() },
    });
  }

  private async issue(user: User): Promise<AuthSession> {
    if (user.disabledAt) throw new ForbiddenException('Bu hesap askıya alındı.');
    const secret = readConfig().jwtAccessSecret;
    const accessToken = await this.jwt.signAsync(
      { sub: user.id },
      { secret, expiresIn: ACCESS_TTL, algorithm: 'HS256' },
    );
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { accessToken, refreshToken, user: await this.toPublicUser(user) };
  }

  private async toPublicUser(user: User): Promise<PublicUser> {
    const awards = await this.prisma.userBadge.findMany({
      where: { userId: user.id, revokedAt: null },
      include: { badge: true },
      orderBy: { badge: { sortOrder: 'asc' } },
    });
    const badges: PublicBadge[] = awards.map((award) => ({
      slug: award.badge.slug,
      name: award.badge.name,
      icon: award.badge.icon,
    }));
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
      badges,
      kvkkAcceptedAt: user.kvkkAcceptedAt.toISOString(),
      termsAcceptedAt: user.termsAcceptedAt.toISOString(),
      marketingAcceptedAt: user.marketingAcceptedAt?.toISOString() ?? null,
      marketingWithdrawnAt: user.marketingWithdrawnAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
