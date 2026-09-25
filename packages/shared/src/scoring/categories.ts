import { ReportCategory } from '@prisma/client';

export const CATEGORY_WEIGHT: Record<ReportCategory, number> = {
  FOOD_POISONING: 1.5,
  HYGIENE: 1.35,
  SCAM_PRICING: 1.2,
  FALSE_ADS: 1.1,
  WRONG_OR_COLD: 1,
  RUDE_SERVICE: 0.9,
};

export const CATEGORY_LABEL: Record<ReportCategory, string> = {
  HYGIENE: 'Hijyen',
  FOOD_POISONING: 'Gıda zehirlenmesi şüphesi',
  SCAM_PRICING: 'Şaibeli fiyat',
  RUDE_SERVICE: 'Kaba hizmet',
  WRONG_OR_COLD: 'Yanlış veya soğuk sipariş',
  FALSE_ADS: 'Yanıltıcı reklam',
};

export const CATEGORY_ORDER: ReportCategory[] = [
  ReportCategory.FOOD_POISONING,
  ReportCategory.HYGIENE,
  ReportCategory.SCAM_PRICING,
  ReportCategory.FALSE_ADS,
  ReportCategory.WRONG_OR_COLD,
  ReportCategory.RUDE_SERVICE,
];
