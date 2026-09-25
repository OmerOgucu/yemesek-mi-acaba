import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { MemoryRateLimiter } from './memory-rate-limiter';

@Injectable()
export class PostRateLimitGuard implements CanActivate {
  private readonly limiter = new MemoryRateLimiter(20, 60_000);

  canActivate(context: ExecutionContext): boolean {
    if (process.env.NODE_ENV === 'test') return true;
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method !== 'POST') return true;
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    if (this.limiter.allow(ip)) return true;
    throw new HttpException(
      'Çok sık yazıyorsun. Bir dakika sonra tekrar dene.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
