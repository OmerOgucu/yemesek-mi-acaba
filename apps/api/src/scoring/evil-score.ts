import { ReportCategory } from '@prisma/client';
import { CATEGORY_WEIGHT } from './categories';

export type ScoreInput = {
  category: ReportCategory;
  severity: number;
  helpfulVotes: number;
};

/**
 * Kötülük skoru — yüksek olan daha kötü.
 * sum(şiddet × kategori ağırlığı) × 8 + şikayet sayısı × 6 + yararlı oy × 2
 * Zehirlenme şüphesi ve hijyen daha ağır basar.
 */
export function computeEvilScore(reports: ScoreInput[]): number {
  if (reports.length === 0) return 0;
  const weighted = reports.reduce(
    (sum, report) => sum + report.severity * CATEGORY_WEIGHT[report.category],
    0,
  );
  const votes = reports.reduce((sum, report) => sum + report.helpfulVotes, 0);
  return Math.round(weighted * 8 + reports.length * 6 + votes * 2);
}

export function scoreLabel(score: number): string {
  if (score <= 0) return 'Temiz sayfa';
  if (score < 50) return 'Fısıltı';
  if (score < 100) return 'Şüpheli';
  if (score < 180) return 'Kaçın';
  return 'Uzak dur';
}
