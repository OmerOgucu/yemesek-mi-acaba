import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { collectPolicyIssues } from '../moderation/content-policy';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthSession, PublicUser } from './auth.types';
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

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    kvkkAcceptedAt: user.kvkkAcceptedAt.toISOString(),
    termsAcceptedAt: user.termsAcceptedAt.toISOString(),
    marketingAcceptedAt: user.marketingAcceptedAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  private readonly dummyHash = bcrypt.hashSync('not-a-real-user', 12);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthSession> {
    assertPassword(dto.password);
    const issues = collectPolicyIssues([{ value: dto.displayName }]);
    if (issues.length) throw new BadRequestException({ message: issues });

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const now = new Date();
    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          displayName: dto.displayName,
          kvkkAcceptedAt: now,
          termsAcceptedAt: now,
          marketingAcceptedAt: dto.acceptMarketing ? now : null,
        },
      });
      return this.issue(user);
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Bu e-posta ile kayıt var.');
      }
      throw error;
    }
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
    return toPublicUser(user);
  }

  async update(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    if (dto.displayName) {
      const issues = collectPolicyIssues([{ value: dto.displayName }]);
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
    return toPublicUser(user);
  }

  async remove(userId: string, dto: DeleteAccountDto): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Giriş gerekli.');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Parola hatalı.');
    await this.prisma.user.delete({ where: { id: userId } });
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

  private async issue(user: User): Promise<AuthSession> {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error('JWT_ACCESS_SECRET tanımlı değil.');
    const accessToken = await this.jwt.signAsync(
      { sub: user.id },
      { secret, expiresIn: ACCESS_TTL },
    );
    const refreshToken = randomBytes(32).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });
    return { accessToken, refreshToken, user: toPublicUser(user) };
  }
}
