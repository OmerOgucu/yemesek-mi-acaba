import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from '@yemesek/auth';
import { PrismaModule } from '@yemesek/database';
import { ReportsModule, VotesModule } from '@yemesek/reports';
import { RestaurantsModule } from '@yemesek/restaurants';
import { PostRateLimitGuard } from './common/post-rate-limit.guard';
import { HealthModule } from './health/health.module';

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, RestaurantsModule, ReportsModule, VotesModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PostRateLimitGuard,
    },
  ],
})
export class AppModule {}
