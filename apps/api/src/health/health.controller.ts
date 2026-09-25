import { Controller, Get } from '@nestjs/common';
import { readConfig } from '@yemesek/config';
import { SettingsService } from '@yemesek/settings';

@Controller('health')
export class HealthController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  async health() {
    const [maintenance, minMobileVersion, minIosBuild, minAndroidBuild] = await Promise.all([
      this.settings.flag('maintenanceMode'),
      this.settings.get('minMobileVersion'),
      this.settings.number('minIosBuild'),
      this.settings.number('minAndroidBuild'),
    ]);
    return {
      status: 'ok',
      service: 'yemesek-api',
      maintenance,
      mailConfigured: Boolean(readConfig().brevoApiKey),
      minMobileVersion,
      minIosBuild,
      minAndroidBuild,
    };
  }
}
