import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { PostRateLimitGuard } from './common/post-rate-limit.guard';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { VotesModule } from './votes/votes.module';

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
