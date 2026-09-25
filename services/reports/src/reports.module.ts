import { Module } from '@nestjs/common';
import { AuthModule } from '@yemesek/auth';
import { EvidenceModule } from '@yemesek/evidence';
import { ModerationModule } from '@yemesek/moderation';
import { RestaurantsModule } from '@yemesek/restaurants';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [RestaurantsModule, AuthModule, ModerationModule, EvidenceModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
