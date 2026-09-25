import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { MemoryRateLimiter } from '@yemesek/shared';

@Injectable()
export class PostRateLimitGuard implements CanActivate {
  private readonly limiter = new MemoryRateLimiter(20, 60_000);
  private readonly sensitive = new MemoryRateLimiter(5, 10 * 60_000);

  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'test') return true;
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method !== 'POST') return true;
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const path = (request.path || request.url || '').split('?')[0];
    const tight = sensitiveBucket(path);
    if (tight && !this.sensitive.allow(`${tight}:${ip}`)) {
      throw new HttpException('Çok fazla deneme. On dakika sonra tekrar dene.', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (this.limiter.allow(ip)) return true;
    throw new HttpException(
      'Çok sık yazıyorsun. Bir dakika sonra tekrar dene.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

function sensitiveBucket(path: string): string | null {
  if (path === '/support') return 'support';
  if (/^\/restaurants\/[^/]+\/claim$/.test(path)) return 'claim';
  return null;
}
