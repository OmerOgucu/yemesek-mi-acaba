import { SEED_RESTAURANTS } from '../../../packages/database/prisma/seed-data';

describe('seed data', () => {
  it('uses a small neutral sample and does not lock cities to İstanbul or KKTC', () => {
    expect(SEED_RESTAURANTS.length).toBeGreaterThanOrEqual(2);
    expect(SEED_RESTAURANTS.length).toBeLessThanOrEqual(6);
    const cities = new Set(SEED_RESTAURANTS.map((restaurant) => restaurant.city));
    expect(cities.has('Örnekşehir')).toBe(true);
    expect(cities.has('Denemekent')).toBe(true);
    expect(cities.has('İstanbul')).toBe(false);
    for (const city of cities) {
      expect(city).not.toMatch(/Girne|Lefkoşa|Gazimağusa|İskele|KKTC/i);
    }
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
