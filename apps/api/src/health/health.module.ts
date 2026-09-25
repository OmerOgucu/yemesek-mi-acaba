import { Module } from '@nestjs/common';
import { SettingsModule } from '@yemesek/settings';
import { HealthController } from './health.controller';

@Module({
  imports: [SettingsModule],
  controllers: [HealthController],
})
export class HealthModule {}
