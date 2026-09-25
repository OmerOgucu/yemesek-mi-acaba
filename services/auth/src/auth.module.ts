import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EvidenceModule } from '@yemesek/evidence';
import { ModerationModule } from '@yemesek/moderation';
import { AuthController } from './auth.controller';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [JwtModule.register({}), ModerationModule, EvidenceModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AuthRateLimitGuard],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
