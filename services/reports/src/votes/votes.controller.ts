import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard } from '@yemesek/auth';
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
