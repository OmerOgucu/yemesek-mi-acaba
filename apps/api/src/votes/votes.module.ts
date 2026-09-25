import { Module } from '@nestjs/common';
import { ReportsModule } from '../reports/reports.module';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [ReportsModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
