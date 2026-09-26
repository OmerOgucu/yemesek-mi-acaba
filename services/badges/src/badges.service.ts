import { Injectable } from '@nestjs/common';
import { PrismaService } from '@yemesek/database';
import { contributionCounts, syncUserBadges } from './sync-user-badges';

@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  sync(userId: string): Promise<void> {
    return syncUserBadges(this.prisma, userId);
  }

  counts(userId: string) {
    return contributionCounts(this.prisma, userId);
  }
}
