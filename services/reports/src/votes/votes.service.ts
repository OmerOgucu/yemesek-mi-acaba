import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BadgesService } from '@yemesek/badges';
import { PrismaService } from '@yemesek/database';
import { ReportsService } from '../reports.service';

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly badges: BadgesService,
  ) {}

  async vote(reportId: string, userId: string): Promise<{ helpfulCount: number; alreadyVoted: boolean }> {
    const report = await this.reports.findOrThrow(reportId);
    if (report.authorId === userId) {
      throw new BadRequestException('Kendi şikayetine oy veremezsin.');
    }
    try {
      await this.prisma.vote.create({
        data: { reportId, userId },
      });
      const helpfulCount = await this.prisma.vote.count({ where: { reportId } });
      await this.badges.sync(userId);
      await this.badges.sync(report.authorId);
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
