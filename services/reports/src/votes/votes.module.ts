import { Module } from '@nestjs/common';
import { AuthModule } from '@yemesek/auth';
import { BadgesModule } from '@yemesek/badges';
import { SettingsModule } from '@yemesek/settings';
import { ReportsModule } from '../reports.module';
import { VotesController } from './votes.controller';
import { VotesService } from './votes.service';

@Module({
  imports: [ReportsModule, AuthModule, BadgesModule, SettingsModule],
  controllers: [VotesController],
  providers: [VotesService],
})
export class VotesModule {}
