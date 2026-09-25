import { Module } from '@nestjs/common';
import { ModerationModule } from '@yemesek/moderation';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SiteController } from './site.controller';

@Module({
  imports: [ModerationModule],
  controllers: [SettingsController, SiteController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
