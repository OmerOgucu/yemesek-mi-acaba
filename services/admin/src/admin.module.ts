import { Module } from '@nestjs/common';
import { AuthModule } from '@yemesek/auth';
import { BadgesModule } from '@yemesek/badges';
import { EvidenceModule } from '@yemesek/evidence';
import { MailModule } from '@yemesek/mail';
import { ModerationModule } from '@yemesek/moderation';
import { SettingsModule } from '@yemesek/settings';
import { AdminController } from './admin.controller';
import { AdminMfaGuard } from './admin-mfa.guard';
import { AdminService } from './admin.service';
import { AuditInterceptor } from './audit.interceptor';

@Module({
  imports: [AuthModule, BadgesModule, MailModule, ModerationModule, EvidenceModule, SettingsModule],
  controllers: [AdminController],
  providers: [AdminService, AuditInterceptor, AdminMfaGuard],
})
export class AdminModule {}
