import { ReportCategory } from '@prisma/client';
import { computeEvilScore, scoreLabel } from './evil-score';

describe('computeEvilScore', () => {
  it('returns 0 when there are no reports', () => {
    expect(computeEvilScore([])).toBe(0);
  });

  it('weights food-poisoning suspicion above a single rude complaint', () => {
    const poisoning = computeEvilScore([
      { category: ReportCategory.FOOD_POISONING, severity: 5, helpfulVotes: 0 },
    ]);
    const rude = computeEvilScore([
      { category: ReportCategory.RUDE_SERVICE, severity: 5, helpfulVotes: 0 },
    ]);
    expect(poisoning).toBe(66);
    expect(rude).toBeLessThan(poisoning);
  });

  it('lets several medium complaints outrank one harsh note', () => {
    const oneHarsh = computeEvilScore([
      { category: ReportCategory.RUDE_SERVICE, severity: 5, helpfulVotes: 0 },
    ]);
    const several = computeEvilScore([
      { category: ReportCategory.HYGIENE, severity: 3, helpfulVotes: 0 },
      { category: ReportCategory.HYGIENE, severity: 3, helpfulVotes: 0 },
      { category: ReportCategory.WRONG_OR_COLD, severity: 3, helpfulVotes: 0 },
      { category: ReportCategory.SCAM_PRICING, severity: 3, helpfulVotes: 1 },
    ]);
    expect(several).toBeGreaterThan(oneHarsh);
  });

  it('increases when a report is marked helpful', () => {
    const base = computeEvilScore([
      { category: ReportCategory.HYGIENE, severity: 4, helpfulVotes: 0 },
    ]);
    const voted = computeEvilScore([
      { category: ReportCategory.HYGIENE, severity: 4, helpfulVotes: 3 },
    ]);
    expect(voted - base).toBe(6);
  });
});

describe('scoreLabel', () => {
  it('maps bands from a clean sheet to stay-away', () => {
    expect(scoreLabel(0)).toBe('Temiz sayfa');
    expect(scoreLabel(49)).toBe('Fısıltı');
    expect(scoreLabel(50)).toBe('Şüpheli');
    expect(scoreLabel(99)).toBe('Şüpheli');
    expect(scoreLabel(100)).toBe('Kaçın');
    expect(scoreLabel(179)).toBe('Kaçın');
    expect(scoreLabel(180)).toBe('Uzak dur');
  });
});
