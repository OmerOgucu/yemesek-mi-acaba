import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthRateLimitGuard } from './auth-rate-limit.guard';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { LoginDto } from './dto/login.dto';
import { ConfirmTotpDto, MfaDto, PasswordResetDto, ResetPasswordDto, VerifyCodeDto, VerifyLinkDto } from './dto/verify-email.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { AuthUser } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @UseGuards(AuthRateLimitGuard)
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  @UseGuards(AuthRateLimitGuard)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @UseGuards(AuthRateLimitGuard)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Get('me/reports')
  @UseGuards(JwtAuthGuard)
  myReports(@CurrentUser() user: AuthUser) {
    return this.auth.myReports(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.update(user.id, dto);
  }

  @Post('me/delete')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() user: AuthUser, @Body() dto: DeleteAccountDto) {
    return this.auth.remove(user.id, dto);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard, AuthRateLimitGuard)
  verify(@CurrentUser() user: AuthUser, @Body() dto: VerifyCodeDto) {
    return this.auth.verifyCode(user.id, dto.code);
  }

  @Post('verify-link')
  @UseGuards(AuthRateLimitGuard)
  verifyLink(@Body() dto: VerifyLinkDto) {
    return this.auth.verifyLink(dto.token);
  }

  @Post('verify/resend')
  @UseGuards(JwtAuthGuard, AuthRateLimitGuard)
  resend(@CurrentUser() user: AuthUser) {
    return this.auth.resend(user.id);
  }

  @Get('dev/verification')
  devHint(@Query('email') email = '') {
    return this.auth.devHint(email);
  }

  @Post('password-reset')
  @UseGuards(AuthRateLimitGuard)
  passwordReset(@Body() dto: PasswordResetDto) {
    return this.auth.requestPasswordReset(dto.email, dto);
  }

  @Post('password-reset/confirm')
  @UseGuards(AuthRateLimitGuard)
  confirmReset(@Body() dto: ResetPasswordDto) {
    return this.auth.confirmPasswordReset(dto.token, dto.password);
  }

  @Post('sessions/revoke')
  @UseGuards(JwtAuthGuard)
  revoke(@CurrentUser() user: AuthUser) {
    return this.auth.revokeSessions(user.id);
  }

  @Post('2fa/setup')
  @UseGuards(JwtAuthGuard)
  setupTotp(@CurrentUser() user: AuthUser) {
    return this.auth.setupTotp(user.id);
  }

  @Post('2fa/confirm')
  @UseGuards(JwtAuthGuard)
  confirmTotp(@CurrentUser() user: AuthUser, @Body() dto: ConfirmTotpDto) {
    return this.auth.confirmTotp(user.id, dto.code);
  }

  @Post('2fa/challenge')
  @UseGuards(AuthRateLimitGuard)
  challenge(@Body() dto: MfaDto) {
    return this.auth.challengeMfa(dto.mfaToken, dto.code, dto.recoveryCode);
  }

  @Post('me/push-token')
  @UseGuards(JwtAuthGuard)
  pushToken(@CurrentUser() user: AuthUser, @Body() body: { token?: string; platform?: string }) {
    return this.auth.savePushToken(user.id, body.token ?? '', body.platform ?? 'unknown');
  }
}
