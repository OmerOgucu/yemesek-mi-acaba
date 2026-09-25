import { Module } from '@nestjs/common';
import { AuthModule } from '@yemesek/auth';
import { ReportsModule } from '../reports.module';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [ReportsModule, AuthModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
