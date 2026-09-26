import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BadgesService } from '@yemesek/badges';
import { PrismaService } from '@yemesek/database';
import { SettingsService } from '@yemesek/settings';
import { ReportsService } from '../reports.service';

@Injectable()
export class VotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: ReportsService,
    private readonly badges: BadgesService,
    private readonly settings: SettingsService,
  ) {}

  async vote(reportId: string, userId: string): Promise<{ helpfulCount: number; alreadyVoted: boolean }> {
    const report = await this.reports.findOrThrow(reportId);
    if (process.env.NODE_ENV !== 'test') {
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const [hourlyCap, venueCap, hourly, venue] = await Promise.all([
        this.settings.number('voteHourlyCap'),
        this.settings.number('voteVenueDailyCap'),
        this.prisma.vote.count({ where: { userId, createdAt: { gt: hourAgo } } }),
        this.prisma.vote.count({
          where: { userId, createdAt: { gt: dayAgo }, report: { restaurantId: report.restaurantId } },
        }),
      ]);
      if (hourly >= hourlyCap || venue >= venueCap) {
        throw new HttpException('Oy hızın yüksek. Biraz sonra tekrar dene.', HttpStatus.TOO_MANY_REQUESTS);
      }
    }
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
