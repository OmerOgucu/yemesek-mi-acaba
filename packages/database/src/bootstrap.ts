import { createHash } from 'crypto';
import type { PrismaClient } from '@prisma/client';

const FIRST_SETTINGS: Record<string, string> = {
  admin2faRequired: 'true',
  publicReportsNeedReview: 'true',
  indexPublicReports: 'false',
};

export type BootstrapResult = 'already_complete' | 'invite_ready' | 'admin_exists';

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim() ?? '';
  if (!value) throw new Error(`Bootstrap için ${key} gerekli.`);
  return value;
}

/** First production install only. A second run does not touch passwords, roles, 2FA, or panel settings. */
export async function bootstrapProduction(prisma: PrismaClient, env: NodeJS.ProcessEnv = process.env): Promise<BootstrapResult> {
  const done = await prisma.siteSetting.findUnique({ where: { key: 'bootstrapComplete' } });
  if (done?.value === 'true') return 'already_complete';

  const email = required(env, 'INITIAL_ADMIN_EMAIL').toLowerCase();
  const secret = required(env, 'INITIAL_ADMIN_SETUP_SECRET');
  const cities = required(env, 'INITIAL_ALLOWED_CITIES');
  if (secret.length < 16) throw new Error('INITIAL_ADMIN_SETUP_SECRET en az 16 karakter olmalı.');
  if (!email.includes('@') || email.endsWith('.local')) {
    throw new Error('INITIAL_ADMIN_EMAIL gerçek bir adres olmalı.');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== 'ADMIN') {
    throw new Error(
      'INITIAL_ADMIN_EMAIL mevcut bir üyeye ait. Sessiz yükseltme yok. Başka bir adres seç veya üyeyi panelden yönet.',
    );
  }

  const tokenHash = createHash('sha256').update(secret).digest('hex');
  await prisma.$transaction(async (tx) => {
    const again = await tx.siteSetting.findUnique({ where: { key: 'bootstrapComplete' } });
    if (again?.value === 'true') return;
    for (const [key, value] of Object.entries(FIRST_SETTINGS)) {
      const row = await tx.siteSetting.findUnique({ where: { key } });
      if (!row) await tx.siteSetting.create({ data: { key, value } });
    }
    const citiesRow = await tx.siteSetting.findUnique({ where: { key: 'allowedCities' } });
    if (!citiesRow) await tx.siteSetting.create({ data: { key: 'allowedCities', value: cities } });
    if (!existing) {
      const pending = await tx.adminInvite.findFirst({
        where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
      });
      if (!pending) {
        await tx.adminInvite.create({
          data: {
            email,
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
    await tx.siteSetting.upsert({
      where: { key: 'bootstrapComplete' },
      update: { value: 'true' },
      create: { key: 'bootstrapComplete', value: 'true' },
    });
  });
  return existing ? 'admin_exists' : 'invite_ready';
}
