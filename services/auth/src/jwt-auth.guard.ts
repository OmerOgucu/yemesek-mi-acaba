import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { readConfig } from '@yemesek/config';
import { PrismaService } from '@yemesek/database';
import type { AuthUser } from './auth.types';

type AccessPayload = { sub?: string };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Giriş gerekli.');
    }
    const token = header.slice('Bearer '.length).trim();
    const secret = readConfig().jwtAccessSecret;

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('Oturum geçersiz veya süresi dolmuş.');
    }
    if (!payload.sub) throw new UnauthorizedException('Oturum geçersiz veya süresi dolmuş.');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Giriş gerekli.');
    if (user.disabledAt) throw new ForbiddenException('Bu hesap askıya alındı.');
    request.user = {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      emailVerified: Boolean(user.emailVerifiedAt),
    };
    return true;
  }
}
