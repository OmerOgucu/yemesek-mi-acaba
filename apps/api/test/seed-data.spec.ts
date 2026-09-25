import { SEED_RESTAURANTS } from '../prisma/seed-data';

describe('seed data', () => {
  it('covers İstanbul and KKTC with 8 to 12 restaurants', () => {
    expect(SEED_RESTAURANTS.length).toBeGreaterThanOrEqual(8);
    expect(SEED_RESTAURANTS.length).toBeLessThanOrEqual(12);
    const cities = new Set(SEED_RESTAURANTS.map((restaurant) => restaurant.city));
    expect(cities.has('İstanbul')).toBe(true);
    expect([...cities].some((city) => city !== 'İstanbul')).toBe(true);
    for (const restaurant of SEED_RESTAURANTS) {
      expect(restaurant.reports.length).toBeGreaterThan(0);
      for (const report of restaurant.reports) {
        expect(report.severity).toBeGreaterThanOrEqual(1);
        expect(report.severity).toBeLessThanOrEqual(5);
        expect(report.title.length).toBeGreaterThanOrEqual(8);
        expect(report.body.length).toBeGreaterThanOrEqual(20);
      }
    }
  });
});
