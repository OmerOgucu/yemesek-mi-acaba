import type { INestApplication } from '@nestjs/common';
import { ReportCategory, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/create-app';
import { PrismaService } from '@yemesek/database';
import { RECEIPT_PNG, VENUE_PNG } from '@yemesek/evidence';

describe('gates, mail, cities, badges, admin', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    const prisma = app.get(PrismaService);
    await prisma.vote.deleteMany();
    await prisma.userBadge.deleteMany();
    await prisma.emailVerification.deleteMany();
    await prisma.report.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.restaurant.deleteMany();
    await prisma.district.deleteMany();
    await prisma.city.deleteMany();
    await prisma.user.deleteMany();
    await prisma.badge.deleteMany();
    await prisma.emailTemplate.deleteMany();
    await prisma.siteSetting.deleteMany();
  });

  async function registerRaw(email: string, displayName = 'Yazar') {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'Sifre1234',
        displayName,
        acceptKvkk: true,
        acceptTerms: true,
      })
      .expect(201);
    return response.body as { accessToken: string; user: { emailVerified: boolean } };
  }

  async function verify(email: string, token: string) {
    const hint = await request(app.getHttpServer()).get('/auth/dev/verification').query({ email }).expect(200);
    await request(app.getHttpServer())
      .post('/auth/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: hint.body.code })
      .expect(201);
    return hint.body as { code: string; verifyUrl: string };
  }

  it('blocks anonymous and unverified venue creation, then accepts a verified user', async () => {
    await request(app.getHttpServer())
      .post('/restaurants')
      .send({ name: 'Kapısız', city: 'Ankara', district: 'Çankaya' })
      .expect(401);

    const fresh = await registerRaw('misafir@example.com');
    expect(fresh.user.emailVerified).toBe(false);
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${fresh.accessToken}`)
      .send({ name: 'Kapısız', city: 'Ankara', district: 'Çankaya' })
      .expect(403);

    await verify('misafir@example.com', fresh.accessToken);
    const missingDistrict = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${fresh.accessToken}`)
      .send({ name: 'Kapısız', city: 'Ankara' })
      .expect(400);
    expect(JSON.stringify(missingDistrict.body)).toContain('İlçe');

    const created = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${fresh.accessToken}`)
      .send({ name: 'Kapısız', city: 'Ankara', district: 'Çankaya' })
      .expect(201);
    expect(created.body.city).toBe('Ankara');
  });

  it('verifies by code and magic link, and hides the dev hint in production', async () => {
    const first = await registerRaw('dogrula@example.com', 'Ada');
    const hint = await request(app.getHttpServer())
      .get('/auth/dev/verification')
      .query({ email: 'dogrula@example.com' })
      .expect(200);
    expect(hint.body.code).toMatch(/^\d{6}$/);
    expect(hint.body.verifyUrl).toContain('/dogrula?token=');

    await request(app.getHttpServer())
      .post('/auth/verify')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .send({ code: '000000' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/auth/verify')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .send({ code: hint.body.code })
      .expect(201);
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${first.accessToken}`)
      .expect(200);
    expect(me.body.emailVerified).toBe(true);

    const second = await registerRaw('link@example.com', 'Link');
    const linkHint = await verify('link@example.com', second.accessToken);
    const token = new URL(linkHint.verifyUrl).searchParams.get('token');
    expect(token).toEqual(expect.any(String));
    await request(app.getHttpServer()).post('/auth/verify-link').send({ token }).expect(400);

    const third = await registerRaw('yeniden@example.com', 'Yeniden');
    await request(app.getHttpServer())
      .post('/auth/verify/resend')
      .set('Authorization', `Bearer ${third.accessToken}`)
      .expect(201);
    const resent = await request(app.getHttpServer())
      .get('/auth/dev/verification')
      .query({ email: 'yeniden@example.com' })
      .expect(200);
    const url = new URL(resent.body.verifyUrl);
    await request(app.getHttpServer())
      .post('/auth/verify-link')
      .send({ token: url.searchParams.get('token') })
      .expect(201);

    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await request(app.getHttpServer()).get('/auth/dev/verification').query({ email: 'yeniden@example.com' }).expect(404);
    } finally {
      process.env.NODE_ENV = previous;
    }

    await request(app.getHttpServer())
      .post('/auth/password-reset')
      .send({ email: 'yok@example.com' })
      .expect(201);
  });

  it('groups cities by normalized spelling and does not require a whitelist', async () => {
    const user = await registerRaw('sehir@example.com', 'Şehir');
    await verify('sehir@example.com', user.accessToken);
    const send = (city: string, district: string, name: string) =>
      request(app.getHttpServer())
        .post('/restaurants')
        .set('Authorization', `Bearer ${user.accessToken}`)
        .send({ name, city, district })
        .expect(201);

    const first = await send('Ankara', 'Çankaya', 'Birinci');
    const second = await send(' ankara ', '  çankaya ', 'İkinci');
    await send('İzmir', 'Konak', 'Üçüncü');
    expect(second.body.city).toBe('Ankara');
    expect(second.body.district).toBe('Çankaya');
    expect(second.body.city).toBe(first.body.city);

    const prisma = app.get(PrismaService);
    expect(await prisma.city.count()).toBe(2);
    expect(await prisma.district.count()).toBe(2);

    const list = await request(app.getHttpServer()).get('/restaurants').expect(200);
    expect(list.body.cities).toEqual(['Ankara', 'İzmir']);
    expect(list.body.locations).toEqual([
      { city: 'Ankara', districts: ['Çankaya'] },
      { city: 'İzmir', districts: ['Konak'] },
    ]);
    const filtered = await request(app.getHttpServer())
      .get('/restaurants')
      .query({ city: 'ANKARA', district: 'ÇANKAYA' })
      .expect(200);
    expect(filtered.body.items).toHaveLength(2);
  });

  it('awards a badge when the report threshold is met and keeps admin routes behind the role', async () => {
    const prisma = app.get(PrismaService);
    const badge = await prisma.badge.create({
      data: {
        slug: 'tek-sikayet',
        name: 'Tek şikayet',
        description: 'Bir şikayet yeter.',
        icon: '🧾',
        metric: 'REPORTS_FILED',
        threshold: 1,
        sortOrder: 1,
        enabled: true,
      },
    });
    const author = await registerRaw('rozet@example.com', 'Rozetli');
    await verify('rozet@example.com', author.accessToken);
    const venue = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Rozet Lokantası', city: 'Bursa', district: 'Nilüfer' })
      .expect(201);

    const before = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(200);
    expect(before.body.badges).toEqual([]);

    await request(app.getHttpServer())
      .post(`/restaurants/${venue.body.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .field('category', ReportCategory.HYGIENE)
      .field('severity', '3')
      .field('title', 'Tezgah kirliydi')
      .field('body', 'Öğle servisinde tezgah silinmemişti ve kaşıklar açıkta duruyordu.')
      .attach('photos', VENUE_PNG, { filename: 'yemek.png', contentType: 'image/png' })
      .attach('receipt', RECEIPT_PNG, { filename: 'fis.png', contentType: 'image/png' })
      .expect(201);

    const after = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(200);
    expect(after.body.badges.map((item: { slug: string }) => item.slug)).toContain('tek-sikayet');

    await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(403);
    await request(app.getHttpServer()).get('/admin/dashboard').expect(401);

    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('Admin1234!', 4),
        displayName: 'Yönetici',
        role: UserRole.ADMIN,
        emailVerifiedAt: new Date(),
        kvkkAcceptedAt: new Date(),
        termsAcceptedAt: new Date(),
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin1234!' })
      .expect(201);
    const dashboard = await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(dashboard.body.members).toBeGreaterThanOrEqual(2);
    expect(dashboard.body.restaurants).toBe(1);
    expect(dashboard.body.reports).toBe(1);

    const users = await request(app.getHttpServer())
      .get('/admin/users')
      .query({ q: 'rozet@example.com' })
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(users.body[0].contribution.reportsFiled).toBe(1);
    expect(users.body[0].contribution.venuesAdded).toBe(1);
    expect(users.body[0].contribution.score).toBe(18);
    expect(users.body[0].emailVerified).toBe(true);

    await request(app.getHttpServer())
      .patch(`/admin/badges/${badge.id}`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        slug: 'tek-sikayet',
        name: 'Tek şikayet',
        description: 'İki şikayet gerekir.',
        icon: '🧾',
        metric: 'REPORTS_FILED',
        threshold: 2,
        sortOrder: 1,
        enabled: true,
      })
      .expect(200);
    const dropped = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(200);
    expect(dropped.body.badges).toEqual([]);

    await request(app.getHttpServer())
      .post(`/admin/users/${dropped.body.id}/badges`)
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ badgeId: badge.id })
      .expect(201);
    const granted = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(200);
    expect(granted.body.badges).toHaveLength(1);

    await request(app.getHttpServer())
      .post('/admin/badges/recompute')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({})
      .expect(201);
    const kept = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(200);
    expect(kept.body.badges).toHaveLength(1);

    const preview = await request(app.getHttpServer())
      .post('/admin/email-templates/email_verification/preview')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ displayName: 'Ada', code: '654321' })
      .expect(201);
    expect(preview.body.subject).toContain('doğrulama');
    expect(preview.body.text).toContain('654321');
    expect(preview.body.html).not.toContain('<script');

    expect(admin.role).toBe(UserRole.ADMIN);
  });

  it('still rejects a report that has a photo but no receipt', async () => {
    const user = await registerRaw('kanit@example.com', 'Kanıt');
    await verify('kanit@example.com', user.accessToken);
    const venue = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${user.accessToken}`)
      .send({ name: 'Kanıt Lokantası', city: 'Eskişehir', district: 'Odunpazarı' })
      .expect(201);
    const missing = await request(app.getHttpServer())
      .post(`/restaurants/${venue.body.id}/reports`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .field('category', ReportCategory.HYGIENE)
      .field('severity', '3')
      .field('title', 'Fişsiz şikayet')
      .field('body', 'Fotoğraf var ama fiş yok, bu yüzden kaydolmamalı.')
      .attach('photos', VENUE_PNG, { filename: 'yemek.png', contentType: 'image/png' })
      .expect(400);
    expect(missing.body.message).toBe('Fiş veya fatura fotoğrafı gerekli.');
  });
});
