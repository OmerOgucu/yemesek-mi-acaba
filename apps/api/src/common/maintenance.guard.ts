import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SettingsService } from '@yemesek/settings';
import type { Request } from 'express';

const OPEN_WRITES = new Set(['/auth/login', '/auth/refresh', '/auth/2fa/challenge', '/auth/admin/setup']);

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly settings: SettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
    const path = (request.path || request.url || '').split('?')[0];
    if (path.startsWith('/admin') || path === '/health' || OPEN_WRITES.has(path)) return true;
    if (!(await this.settings.flag('maintenanceMode'))) return true;
    throw new HttpException('Bakımdayız. Kısa süre sonra tekrar dene.', HttpStatus.SERVICE_UNAVAILABLE);
  }
}
