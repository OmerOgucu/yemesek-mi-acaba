import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { MemoryRateLimiter } from '../common/memory-rate-limiter';

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly limiter = new MemoryRateLimiter(8, 10 * 60_000);

  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'test') return true;
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    if (this.limiter.allow(`auth:${ip}`)) return true;
    throw new HttpException(
      'Çok fazla giriş denemesi. On dakika sonra tekrar dene.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
