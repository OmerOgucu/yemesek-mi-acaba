import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';
import { CreateVoteDto } from './dto/create-vote.dto';

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
  ) {}

  async vote(reportId: string, dto: CreateVoteDto): Promise<{ helpfulCount: number; alreadyVoted: boolean }> {
    await this.reports.findOrThrow(reportId);
    try {
      await this.prisma.vote.create({
        data: { reportId, voterKey: dto.voterKey },
      });
      const helpfulCount = await this.prisma.vote.count({ where: { reportId } });
      return { helpfulCount, alreadyVoted: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const helpfulCount = await this.prisma.vote.count({ where: { reportId } });
        return { helpfulCount, alreadyVoted: true };
      }
      throw error;
    }
  }
}
