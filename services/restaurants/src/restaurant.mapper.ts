import { ReportCategory, VenueStatus } from '@prisma/client';
import { photoUrlList, publicUploadPath } from '@yemesek/evidence';
import { CATEGORY_LABEL, computeEvilScore, foldTr, scoreLabel, type ScoreInput } from '@yemesek/shared';

export type ScoredReport = {
  category: ReportCategory;
  severity: number;
  _count: { votes: number };
};

export type ReportRow = ScoredReport & {
  id: string;
  title: string;
  body: string;
  nickname: string;
  createdAt: Date;
  photoUrls: unknown;
  receiptUrl: string;
  evidenceVerified: boolean;
  moderationStatus: string;
  replies?: { body: string; onBehalf: boolean; createdAt: Date }[];
};

export type RestaurantBase = {
  id: string;
  name: string;
  city: string;
  district: string | null;
  addressHint: string | null;
  cuisine: string | null;
  brandName: string | null;
  status: VenueStatus;
  venueReply: string | null;
  venueReplyOnBehalf: boolean;
  createdAt: Date;
};

export type RestaurantRow = RestaurantBase & {
  reports: ReportRow[];
};

export type CategoryCount = {
  category: ReportCategory;
  label: string;
  count: number;
};

export type RestaurantSummary = {
  id: string;
  name: string;
  city: string;
  district: string | null;
  addressHint: string | null;
  cuisine: string | null;
  brandName: string | null;
  status: VenueStatus;
  venueReply: string | null;
  venueReplyOnBehalf: boolean;
  createdAt: string;
  reportCount: number;
  helpfulVotes: number;
  evilScore: number;
  scoreLabel: string;
  topCategories: CategoryCount[];
};

export type ReportView = {
  id: string;
  category: ReportCategory;
  categoryLabel: string;
  severity: number;
  title: string;
  body: string;
  nickname: string;
  createdAt: string;
  helpfulCount: number;
  photoUrls: string[];
  receiptUrl: string;
  evidenceVerified: boolean;
  moderationStatus: string;
  replies: { body: string; onBehalf: boolean; createdAt: string }[];
};

function toScoreInput(reports: ScoredReport[]): ScoreInput[] {
  return reports.map((report) => ({
    category: report.category,
    severity: report.severity,
    helpfulVotes: report._count.votes,
  }));
}

export function topCategories(reports: { category: ReportCategory }[]): CategoryCount[] {
  const counts = new Map<ReportCategory, number>();
  for (const report of reports) {
    counts.set(report.category, (counts.get(report.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([category, count]) => ({
      category,
      label: CATEGORY_LABEL[category],
      count,
    }));
}

export function toSummary(restaurant: RestaurantBase & { reports: ScoredReport[] }): RestaurantSummary {
  const evilScore = computeEvilScore(toScoreInput(restaurant.reports));
  const helpfulVotes = restaurant.reports.reduce((sum, report) => sum + report._count.votes, 0);
  return {
    id: restaurant.id,
    name: restaurant.name,
    city: restaurant.city,
    district: restaurant.district,
    addressHint: restaurant.addressHint,
    cuisine: restaurant.cuisine,
    brandName: restaurant.brandName,
    status: restaurant.status,
    venueReply: restaurant.venueReply,
    venueReplyOnBehalf: restaurant.venueReplyOnBehalf,
    createdAt: restaurant.createdAt.toISOString(),
    reportCount: restaurant.reports.length,
    helpfulVotes,
    evilScore,
    scoreLabel: scoreLabel(evilScore),
    topCategories: topCategories(restaurant.reports),
  };
}

export function toReportView(report: ReportRow): ReportView {
  return {
    id: report.id,
    category: report.category,
    categoryLabel: CATEGORY_LABEL[report.category],
    severity: report.severity,
    title: report.title,
    body: report.body,
    nickname: report.nickname,
    createdAt: report.createdAt.toISOString(),
    helpfulCount: report._count.votes,
    photoUrls: photoUrlList(report.photoUrls),
    receiptUrl: publicUploadPath(report.receiptUrl) ?? '',
    evidenceVerified: report.evidenceVerified,
    moderationStatus: report.moderationStatus,
    replies: (report.replies ?? []).map((reply) => ({
      body: reply.body,
      onBehalf: reply.onBehalf,
      createdAt: reply.createdAt.toISOString(),
    })),
  };
}

export { foldTr };
