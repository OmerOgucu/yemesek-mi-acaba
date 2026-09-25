import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { AuthUser, CurrentUser, JwtAuthGuard, VerifiedEmailGuard } from '@yemesek/auth';
import { TrustService } from './trust.service';

class ReasonDto {
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  reason!: string;
}

class BodyDto {
  @IsString()
  @MinLength(8)
  @MaxLength(2000)
  body!: string;
}

@Controller()
export class TrustController {
  constructor(private readonly trust: TrustService) {}

  @Post('reports/:id/withdraw')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  withdraw(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.trust.withdraw(id, user.id);
  }

  @Post('reports/:id/flags')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  flagReport(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReasonDto) {
    return this.trust.flag(user, { reportId: id, reason: dto.reason });
  }

  @Post('restaurants/:id/flags')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  flagRestaurant(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: ReasonDto) {
    return this.trust.flag(user, { restaurantId: id, reason: dto.reason });
  }

  @Post('reports/:id/appeals')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  appeal(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: BodyDto) {
    return this.trust.appeal(id, user, dto.body);
  }

  @Post('users/:id/block')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  block(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.trust.block(user.id, id);
  }

  @Post('reports/:id/replies')
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
  reply(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() dto: BodyDto) {
    return this.trust.reply(id, user, dto.body);
  }
}
