import { Module } from '@nestjs/common';
import { AuthModule } from '@yemesek/auth';
import { BadgesModule } from '@yemesek/badges';
import { EvidenceModule } from '@yemesek/evidence';
import { MailModule } from '@yemesek/mail';
import { ModerationModule } from '@yemesek/moderation';
import { SettingsModule } from '@yemesek/settings';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, BadgesModule, MailModule, ModerationModule, EvidenceModule, SettingsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
