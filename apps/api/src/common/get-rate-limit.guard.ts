import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { MemoryRateLimiter } from '@yemesek/shared';

@Injectable()
export class GetRateLimitGuard implements CanActivate {
  private readonly anonymous = new MemoryRateLimiter(120, 60_000);
  private readonly keyed = new MemoryRateLimiter(600, 60_000);

  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'test') return true;
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method !== 'GET' || request.path === '/health') return true;
    const bulkKey = process.env.BULK_API_KEY?.trim();
    const presented = request.header('x-api-key');
    const limiter = bulkKey && presented === bulkKey ? this.keyed : this.anonymous;
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    if (limiter.allow(`get:${ip}`)) return true;
    throw new HttpException('Çok fazla okuma. Bir dakika sonra tekrar dene.', HttpStatus.TOO_MANY_REQUESTS);
  }
}
