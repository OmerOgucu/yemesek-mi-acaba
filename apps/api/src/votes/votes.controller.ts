import { Body, Controller, Param, Post } from '@nestjs/common';
import { CreateVoteDto } from './dto/create-vote.dto';
import { VotesService } from './votes.service';

@Controller('reports')
export class VotesController {
  constructor(private readonly votes: VotesService) {}

  @Post(':id/votes')
  vote(@Param('id') id: string, @Body() dto: CreateVoteDto) {
    return this.votes.vote(id, dto);
  }
}
