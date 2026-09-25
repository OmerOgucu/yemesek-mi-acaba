import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
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
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new UnauthorizedException('Giriş gerekli.');

    let payload: AccessPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessPayload>(token, { secret });
    } catch {
      throw new UnauthorizedException('Oturum geçersiz veya süresi dolmuş.');
    }
    if (!payload.sub) throw new UnauthorizedException('Oturum geçersiz veya süresi dolmuş.');

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Giriş gerekli.');
    request.user = { id: user.id, email: user.email, displayName: user.displayName };
    return true;
  }
}
