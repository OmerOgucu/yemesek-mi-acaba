import { BadgeMetric, type PrismaClient } from '@prisma/client';

export async function contributionCounts(prisma: PrismaClient, userId: string) {
  const visibleReport = { hidden: false, moderationStatus: { not: 'REJECTED' as const } };
  const [reportsFiled, helpfulVotesGiven, venuesAdded, helpfulVotesReceived] = await Promise.all([
    prisma.report.count({ where: { authorId: userId, ...visibleReport } }),
    prisma.vote.count({ where: { userId } }),
    prisma.restaurant.count({ where: { createdById: userId, hidden: false } }),
    prisma.vote.count({ where: { report: { authorId: userId, ...visibleReport } } }),
  ]);
  return { reportsFiled, helpfulVotesReceived, venuesAdded, helpfulVotesGiven };
}

function metricValue(
  metric: BadgeMetric,
  counts: Awaited<ReturnType<typeof contributionCounts>>,
): number {
  if (metric === BadgeMetric.REPORTS_FILED) return counts.reportsFiled;
  if (metric === BadgeMetric.HELPFUL_VOTES_RECEIVED) return counts.helpfulVotesReceived;
  if (metric === BadgeMetric.VENUES_ADDED) return counts.venuesAdded;
  return counts.helpfulVotesGiven;
}

export async function syncUserBadges(prisma: PrismaClient, userId: string): Promise<void> {
  const [counts, badges] = await Promise.all([
    contributionCounts(prisma, userId),
    prisma.badge.findMany({ where: { enabled: true } }),
  ]);
  for (const badge of badges) {
    const met = metricValue(badge.metric, counts) >= badge.threshold;
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
    });
    if (!existing) {
      if (met) {
        await prisma.userBadge.create({ data: { userId, badgeId: badge.id, source: 'AUTO' } });
      }
      continue;
    }
    if (existing.source === 'MANUAL') continue;
    if (met && existing.revokedAt) {
      await prisma.userBadge.update({
        where: { id: existing.id },
        data: { revokedAt: null, awardedAt: new Date() },
      });
    } else if (!met && !existing.revokedAt) {
      await prisma.userBadge.update({ where: { id: existing.id }, data: { revokedAt: new Date() } });
    }
  }
}
