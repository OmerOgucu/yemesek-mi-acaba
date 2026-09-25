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
import type { AuthSession, PublicBadge, PublicUser } from './auth.types';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly moderation: ModerationService,
    private readonly evidence: EvidenceService,
    private readonly mail: MailService,
    private readonly settings: SettingsService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSession> {
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

  async login(dto: LoginDto): Promise<AuthSession> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? this.dummyHash);
    if (!user || !ok) {
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }
    return this.issue(user);
  }

  async refresh(dto: RefreshDto): Promise<AuthSession> {
    const tokenHash = hashToken(dto.refreshToken);
    const row = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!row) throw new UnauthorizedException('Oturum yenilenemedi.');
    if (row.revokedAt) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: row.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Oturum yenilenemedi.');
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Oturum yenilenemedi.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: row.userId } });
    if (!user) throw new UnauthorizedException('Oturum yenilenemedi.');
    await this.prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
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
    if (dto.acceptMarketing === true && !current.marketingAcceptedAt) marketingAcceptedAt = new Date();
    if (dto.acceptMarketing === false) marketingAcceptedAt = null;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName ?? current.displayName,
        marketingAcceptedAt,
      },
    });
    return this.toPublicUser(user);
  }

  async remove(userId: string, dto: DeleteAccountDto): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Giriş gerekli.');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Parola hatalı.');
    const reports = await this.prisma.report.findMany({
      where: { authorId: userId },
      select: { photoUrls: true, receiptUrl: true },
    });
    await this.prisma.user.delete({ where: { id: userId } });
    for (const report of reports) {
      for (const url of this.evidence.photoUrls(report.photoUrls)) this.evidence.remove(url);
      const receipt = this.evidence.publicPath(report.receiptUrl);
      if (receipt) this.evidence.remove(receipt);
    }
    return { ok: true };
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
    const user = await this.consumeVerification({ userId, codeHash: hashToken(code) });
    return this.toPublicUser(user);
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

  passwordResetStub(): { ok: true; message: string } {
    return {
      ok: true,
      message: 'Hesap varsa sıfırlama yönergesi daha sonra e-posta ile gelir. Bu sürümde gönderilmez.',
    };
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

  private async issue(user: User): Promise<AuthSession> {
    if (user.disabledAt) throw new ForbiddenException('Bu hesap askıya alındı.');
    const secret = readConfig().jwtAccessSecret;
    const accessToken = await this.jwt.signAsync({ sub: user.id }, { secret, expiresIn: ACCESS_TTL });
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
      createdAt: user.createdAt.toISOString(),
    };
  }
}
