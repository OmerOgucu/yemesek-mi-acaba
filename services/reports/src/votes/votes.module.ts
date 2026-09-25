import { Module } from '@nestjs/common';
import { AuthModule } from '@yemesek/auth';
import { BadgesModule } from '@yemesek/badges';
import { ReportsModule } from '../reports.module';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [ReportsModule, AuthModule, BadgesModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
