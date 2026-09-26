import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EvidenceModule } from '@yemesek/evidence';
import { MailModule } from '@yemesek/mail';
import { ModerationModule } from '@yemesek/moderation';
import { SettingsModule } from '@yemesek/settings';
import { AuthController } from './auth.controller';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { VerifiedEmailGuard } from './verified-email.guard';

@Module({
  imports: [JwtModule.register({}), ModerationModule, EvidenceModule, MailModule, SettingsModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AuthRateLimitGuard, RolesGuard, VerifiedEmailGuard],
  exports: [JwtAuthGuard, RolesGuard, VerifiedEmailGuard, JwtModule],
})
export class AuthModule {}
