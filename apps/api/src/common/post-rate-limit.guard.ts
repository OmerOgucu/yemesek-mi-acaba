import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { consumeBucket, PrismaService } from '@yemesek/database';

@Injectable()
export class PostRateLimitGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_FORCE !== '1') return true;
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method !== 'POST') return true;
    const ip = (request.ip || request.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
    const path = (request.path || request.url || '').split('?')[0];
    const tight = sensitiveBucket(path);
    if (tight && !(await consumeBucket(this.prisma, `${tight}:${ip}`, 5, 10 * 60_000))) {
      throw new HttpException('Çok fazla deneme. On dakika sonra tekrar dene.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (await consumeBucket(this.prisma, `post:${ip}`, 20, 60_000)) return true;
    throw new HttpException('Çok sık yazıyorsun. Bir dakika sonra tekrar dene.', HttpStatus.TOO_MANY_REQUESTS);
  }
}

function sensitiveBucket(path: string): string | null {
  if (path === '/support') return 'support';
  if (/^\/restaurants\/[^/]+\/claim$/.test(path)) return 'claim';
  return null;
}
