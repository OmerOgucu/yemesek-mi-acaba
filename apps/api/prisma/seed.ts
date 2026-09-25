import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { writeSeedPlaceholders } from '../src/uploads/evidence-files';
import { SEED_RESTAURANTS } from './seed-data';

export const DEMO_EMAIL = 'demo@yemesek.local';
export const DEMO_PASSWORD = 'Demo1234!';

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
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.restaurant.deleteMany();

  const demo = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      displayName: 'Demo',
      kvkkAcceptedAt: now,
      termsAcceptedAt: now,
      createdAt: daysAgo(60),
    },
  });

  const voterHash = await bcrypt.hash(randomBytes(24).toString('hex'), 4);
  const voters: { id: string }[] = [];
  for (let index = 0; index < 4; index += 1) {
    voters.push(
      await prisma.user.create({
        data: {
          email: `seed-voter-${index}@yemesek.local`,
          passwordHash: voterHash,
          displayName: `Okur ${index + 1}`,
          kvkkAcceptedAt: now,
          termsAcceptedAt: now,
          createdAt: daysAgo(50),
        },
      }),
    );
  }

  const evidence = writeSeedPlaceholders();

  for (const restaurant of SEED_RESTAURANTS) {
    await prisma.restaurant.create({
      data: {
        name: restaurant.name,
        city: restaurant.city,
        district: restaurant.district,
        addressHint: restaurant.addressHint,
        cuisine: restaurant.cuisine,
        createdAt: daysAgo(restaurant.daysAgo),
        reports: {
          create: restaurant.reports.map((report) => ({
            authorId: demo.id,
            category: report.category,
            severity: report.severity,
            title: report.title,
            body: report.body,
            nickname: report.nickname,
            photoUrls: [evidence.photoUrl],
            receiptUrl: evidence.receiptUrl,
            createdAt: daysAgo(report.daysAgo),
            votes: {
              create: voters.slice(0, report.votes).map((voter) => ({
                userId: voter.id,
                createdAt: daysAgo(Math.max(report.daysAgo - 1, 0)),
              })),
            },
          })),
        },
      },
    });
  }

  const count = await prisma.restaurant.count();
  console.log(`Seed tamam: ${count} mekan. Demo: ${DEMO_EMAIL}`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
