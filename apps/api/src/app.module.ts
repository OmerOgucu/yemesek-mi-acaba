import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AdminModule } from '@yemesek/admin';
import { AuthModule } from '@yemesek/auth';
import { PrismaModule } from '@yemesek/database';
import { ReportsModule, VotesModule } from '@yemesek/reports';
import { RestaurantsModule } from '@yemesek/restaurants';
import { SettingsModule } from '@yemesek/settings';
import { ClientVersionGuard } from './common/client-version.guard';
import { GetRateLimitGuard } from './common/get-rate-limit.guard';
import { MaintenanceGuard } from './common/maintenance.guard';
import { PostRateLimitGuard } from './common/post-rate-limit.guard';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [PrismaModule, HealthModule, AuthModule, RestaurantsModule, ReportsModule, VotesModule, SettingsModule, AdminModule, MediaModule, JobsModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PostRateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: GetRateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MaintenanceGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ClientVersionGuard,
    },
  ],
})
export class AppModule {}
