import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ReportsModule } from '../reports/reports.module';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [ReportsModule, AuthModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
