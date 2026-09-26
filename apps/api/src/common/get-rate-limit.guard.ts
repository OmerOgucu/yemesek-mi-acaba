import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { consumeBucket, PrismaService } from '@yemesek/database';

@Injectable()
export class GetRateLimitGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_FORCE !== '1') return true;
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method !== 'GET' || request.path === '/health' || request.path === '/ready') return true;
    const ip = (request.ip || request.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
    const path = (request.path || request.url || '').split('?')[0];
    if (path === '/auth/me/export' && !(await consumeBucket(this.prisma, `export:${ip}`, 5, 10 * 60_000))) {
      throw new HttpException('Veri indirme çok sık. On dakika sonra tekrar dene.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const bulkKey = process.env.BULK_API_KEY?.trim();
    const presented = request.header('x-api-key');
    const max = bulkKey && presented === bulkKey ? 600 : 120;
    if (await consumeBucket(this.prisma, `get:${ip}`, max, 60_000)) return true;
    throw new HttpException('Çok fazla okuma. Bir dakika sonra tekrar dene.', HttpStatus.TOO_MANY_REQUESTS);
  }
}
