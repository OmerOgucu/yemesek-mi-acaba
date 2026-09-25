import { PrismaClient, type BadgeMetric } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { syncUserBadges } from '../../../services/badges/src/sync-user-badges';
import { findOrCreateLocation } from '../../../services/restaurants/src/location';
import { writeSeedPlaceholders } from '../../../services/evidence/src/evidence-files';
import { SEED_RESTAURANTS } from './seed-data';

export const DEMO_EMAIL = 'demo@yemesek.local';
export const DEMO_PASSWORD = 'Demo1234!';
export const ADMIN_EMAIL = 'admin@yemesek.local';
export const ADMIN_PASSWORD = 'Admin1234!';

const BADGES: { slug: string; name: string; description: string; icon: string; metric: BadgeMetric; threshold: number; sortOrder: number }[] = [
  { slug: 'ilk-fis', name: 'İlk fiş', description: 'İlk şikayetini bıraktı.', icon: '🧾', metric: 'REPORTS_FILED', threshold: 1, sortOrder: 1 },
  { slug: 'ses-getiren', name: 'Ses getiren', description: 'Şikayetleri en az 3 yararlı oy aldı.', icon: '👍', metric: 'HELPFUL_VOTES_RECEIVED', threshold: 3, sortOrder: 2 },
  { slug: 'mekan-avcisi', name: 'Mekan avcısı', description: 'En az bir mekan ekledi.', icon: '📍', metric: 'VENUES_ADDED', threshold: 1, sortOrder: 3 },
  { slug: 'destekci', name: 'Destekçi', description: 'Beş yararlı oy verdi.', icon: '🤝', metric: 'HELPFUL_VOTES_GIVEN', threshold: 5, sortOrder: 4 },
];

const TEMPLATES = [
  {
    key: 'email_verification',
    subject: 'E-posta doğrulama kodun',
    htmlBody:
      '<p>Merhaba {{displayName}},</p><p>Doğrulama kodun: <strong>{{code}}</strong></p><p><a href="{{verifyUrl}}">E-postayı doğrula</a></p>',
    textBody: 'Merhaba {{displayName}}, doğrulama kodun {{code}}. Bağlantı: {{verifyUrl}}',
  },
  {
    key: 'welcome',
    subject: 'Aramıza hoş geldin',
    htmlBody: '<p>Merhaba {{displayName}}, e-postan doğrulandı. Artık mekan ekleyebilir ve şikayet bırakabilirsin.</p>',
    textBody: 'Merhaba {{displayName}}, e-postan doğrulandı. Artık mekan ekleyebilir ve şikayet bırakabilirsin.',
  },
  {
    key: 'password_reset',
    subject: 'Parola sıfırlama',
    htmlBody: '<p>Merhaba {{displayName}}, parola sıfırlama bu sürümde henüz gönderilmez. Şablon yayın öncesi hazır durur.</p>',
    textBody: 'Merhaba {{displayName}}, parola sıfırlama bu sürümde henüz gönderilmez.',
  },
];

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

  await prisma.userBadge.deleteMany();
  await prisma.emailVerification.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.report.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.district.deleteMany();
  await prisma.city.deleteMany();
  await prisma.user.deleteMany();

  const demo = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      displayName: 'Demo',
      emailVerifiedAt: now,
      kvkkAcceptedAt: now,
      termsAcceptedAt: now,
      createdAt: daysAgo(60),
    },
  });

  await prisma.user.create({
    data: {
      email: ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
      displayName: 'Yönetici',
      role: 'ADMIN',
      emailVerifiedAt: now,
      kvkkAcceptedAt: now,
      termsAcceptedAt: now,
      createdAt: daysAgo(70),
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
          emailVerifiedAt: now,
          kvkkAcceptedAt: now,
          termsAcceptedAt: now,
          createdAt: daysAgo(50),
        },
      }),
    );
  }

  const evidence = writeSeedPlaceholders();

  for (const restaurant of SEED_RESTAURANTS) {
    const location = await findOrCreateLocation(prisma, restaurant.city, restaurant.district);
    await prisma.restaurant.create({
      data: {
        name: restaurant.name,
        city: location.city,
        cityKey: location.cityKey,
        cityId: location.cityId,
        district: location.district,
        districtId: location.districtId,
        addressHint: restaurant.addressHint,
        cuisine: restaurant.cuisine,
        createdById: demo.id,
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

  for (const badge of BADGES) {
    await prisma.badge.upsert({
      where: { slug: badge.slug },
      update: {},
      create: badge,
    });
  }

  for (const template of TEMPLATES) {
    await prisma.emailTemplate.upsert({
      where: { key: template.key },
      update: {},
      create: template,
    });
  }

  await prisma.siteSetting.upsert({
    where: { key: 'registrationOpen' },
    update: {},
    create: { key: 'registrationOpen', value: 'true' },
  });
  await prisma.siteSetting.upsert({
    where: { key: 'evidenceHint' },
    update: {},
    create: {
      key: 'evidenceHint',
      value: 'En az 1 mekan fotoğrafı ve 1 fiş zorunlu. Bu metin kuralı gevşetmez.',
    },
  });
  await prisma.siteSetting.upsert({
    where: { key: 'publicReportsNeedReview' },
    update: {},
    create: { key: 'publicReportsNeedReview', value: 'false' },
  });

  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) await syncUserBadges(prisma, user.id);

  const count = await prisma.restaurant.count();
  console.log(`Seed tamam: ${count} mekan. Demo: ${DEMO_EMAIL}. Yönetici: ${ADMIN_EMAIL}`);
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
