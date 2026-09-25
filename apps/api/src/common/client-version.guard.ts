import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { SettingsService } from '@yemesek/settings';
import type { Request } from 'express';
import { compareSemver } from './semver';

@Injectable()
export class ClientVersionGuard implements CanActivate {
  constructor(private readonly settings: SettingsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = (request.path || request.url || '').split('?')[0];
    if (path === '/health' || path === '/ready') return true;
    const version = request.header('x-app-version');
    const minVersion = await this.settings.get('minMobileVersion');
    if (version && minVersion && compareSemver(version, minVersion) < 0) {
      throw new HttpException('Lütfen güncelleyin.', 426);
    }
    const ios = Number(request.header('x-ios-build'));
    const minIos = await this.settings.number('minIosBuild');
    if (request.header('x-ios-build') && minIos > 0 && Number.isInteger(ios) && ios < minIos) {
      throw new HttpException('Lütfen güncelleyin.', 426);
    }
    const android = Number(request.header('x-android-build'));
    const minAndroid = await this.settings.number('minAndroidBuild');
    if (request.header('x-android-build') && minAndroid > 0 && Number.isInteger(android) && android < minAndroid) {
      throw new HttpException('Lütfen güncelleyin.', 426);
    }
    return true;
  }
}
