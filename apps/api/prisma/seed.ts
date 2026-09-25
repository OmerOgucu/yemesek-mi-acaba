import { PrismaClient } from '@prisma/client';
import { SEED_RESTAURANTS } from './seed-data';

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL tanımlı değil.');
  }

  const prisma = new PrismaClient();
  const now = new Date('2026-09-25T09:00:00.000Z');
  const daysAgo = (days: number) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - days);
    return date;
  };

  await prisma.vote.deleteMany();
  await prisma.report.deleteMany();
  await prisma.restaurant.deleteMany();

  for (const [restaurantIndex, restaurant] of SEED_RESTAURANTS.entries()) {
    await prisma.restaurant.create({
      data: {
        name: restaurant.name,
        city: restaurant.city,
        district: restaurant.district,
        addressHint: restaurant.addressHint,
        cuisine: restaurant.cuisine,
        createdAt: daysAgo(restaurant.daysAgo),
        reports: {
          create: restaurant.reports.map((report, reportIndex) => ({
            category: report.category,
            severity: report.severity,
            title: report.title,
            body: report.body,
            nickname: report.nickname,
            createdAt: daysAgo(report.daysAgo),
            votes: {
              create: Array.from({ length: report.votes }, (_, voteIndex) => ({
                voterKey: `seed-${restaurantIndex}-${reportIndex}-${voteIndex}`,
                createdAt: daysAgo(Math.max(report.daysAgo - 1, 0)),
              })),
            },
          })),
        },
      },
    });
  }

  const count = await prisma.restaurant.count();
  console.log(`Seed tamam: ${count} mekan.`);
  await prisma.$disconnect();
}

main().catch(async (error: unknown) => {
  console.error(error);
  process.exit(1);
});
