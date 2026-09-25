import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VotesService } from './votes.service';

@Controller('reports')
export class VotesController {
  constructor(private readonly votes: VotesService) {}

  @Post(':id/votes')
  @UseGuards(JwtAuthGuard)
  vote(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.votes.vote(id, user.id);
  }
}
