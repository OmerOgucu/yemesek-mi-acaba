import type { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { totpNow } from '@yemesek/auth';
import { PrismaService } from '@yemesek/database';
import { RECEIPT_PNG, VENUE_PNG } from '@yemesek/evidence';
import { createApp } from '../src/create-app';
import { resetDb } from './reset-db';

describe('trust and abuse controls', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createApp();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDb(app.get(PrismaService));
  });

  async function register(email: string) {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'Sifre1234',
        displayName: 'Yazar',
        acceptKvkk: true,
        acceptTerms: true,
        ageConfirmed: true,
      })
      .expect(201);
    const hint = await request(app.getHttpServer()).get('/auth/dev/verification').query({ email }).expect(200);
    await request(app.getHttpServer())
      .post('/auth/verify')
      .set('Authorization', `Bearer ${response.body.accessToken}`)
      .send({ code: hint.body.code })
      .expect(201);
    return response.body as { accessToken: string; refreshToken: string };
  }

  it('resets a password, drops old sessions, and bypasses captcha in test', async () => {
    const previous = process.env.CAPTCHA_PROVIDER;
    process.env.CAPTCHA_PROVIDER = 'turnstile';
    const session = await register('sifre@example.com');
    process.env.CAPTCHA_PROVIDER = previous;
    await request(app.getHttpServer()).post('/auth/password-reset').send({ email: 'sifre@example.com' }).expect(201);
    const hint = await request(app.getHttpServer()).get('/auth/dev/verification').query({ email: 'sifre@example.com' }).expect(200);
    const token = new URL(hint.body.verifyUrl).searchParams.get('token');
    await request(app.getHttpServer())
      .post('/auth/password-reset/confirm')
      .send({ token, password: 'Yeni1234' })
      .expect(201);
    await request(app.getHttpServer()).post('/auth/refresh').send({ refreshToken: session.refreshToken }).expect(401);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'sifre@example.com', password: 'Yeni1234' })
      .expect(201);
  });

  it('anonymizes a deleted account and keeps the report for purge', async () => {
    const author = await register('sil@example.com');
    const venue = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Silinecek', city: 'Ankara', district: 'Çankaya' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/restaurants/${venue.body.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .field('category', 'HYGIENE')
      .field('severity', '3')
      .field('title', 'Tezgah yapış yapıştı')
      .field('body', 'Öğle servisinde tezgah silinmemişti ve kaşıklar açıkta duruyordu.')
      .attach('photos', VENUE_PNG, { filename: 'v.png', contentType: 'image/png' })
      .attach('receipt', RECEIPT_PNG, { filename: 'r.png', contentType: 'image/png' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/me/delete')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ password: 'Sifre1234' })
      .expect(201);
    const prisma = app.get(PrismaService);
    const user = await prisma.user.findFirst({ where: { displayName: 'Silinmiş kullanıcı' } });
    expect(user?.email.endsWith('@deleted.local')).toBe(true);
    expect(await prisma.report.count()).toBe(1);
    const report = await prisma.report.findFirst();
    expect(report?.evidencePurgeAfter).toBeTruthy();
    await request(app.getHttpServer()).post('/auth/login').send({ email: 'sil@example.com', password: 'Sifre1234' }).expect(401);
  });

  it('lets a claimed owner reply and an author withdraw', async () => {
    const author = await register('yazar2@example.com');
    const owner = await register('sahip@example.com');
    const venue = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Yanıt Lokantası', city: 'Ankara', district: 'Çankaya' })
      .expect(201);
    const duplicate = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: '  yanıt   lokantası ', city: 'ankara', district: 'çankaya' })
      .expect(409);
    expect(duplicate.body.existingId).toBe(venue.body.id);
    const filed = await request(app.getHttpServer())
      .post(`/restaurants/${venue.body.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .field('category', 'HYGIENE')
      .field('severity', '3')
      .field('title', 'Tezgah yapış yapıştı')
      .field('body', 'Öğle servisinde tezgah silinmemişti ve kaşıklar açıkta duruyordu.')
      .attach('photos', VENUE_PNG, { filename: 'v.png', contentType: 'image/png' })
      .attach('receipt', RECEIPT_PNG, { filename: 'r.png', contentType: 'image/png' })
      .expect(201);
    const claim = await request(app.getHttpServer())
      .post(`/restaurants/${venue.body.id}/claim`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ note: 'İşletme sahibiyim' })
      .expect(201);
    const prisma = app.get(PrismaService);
    const adminHash = await bcrypt.hash('Admin1234!', 4);
    await prisma.user.create({
      data: {
        email: 'admin@example.com',
        passwordHash: adminHash,
        displayName: 'Yönetici',
        role: UserRole.ADMIN,
        emailVerifiedAt: new Date(),
        kvkkAcceptedAt: new Date(),
        termsAcceptedAt: new Date(),
        ageConfirmedAt: new Date(),
      },
    });
    const admin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin1234!' })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/admin/claims/${claim.body.id}`)
      .set('Authorization', `Bearer ${admin.body.accessToken}`)
      .send({ status: 'APPROVED' })
      .expect(200);
    await request(app.getHttpServer())
      .post(`/reports/${filed.body.id}/replies`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ body: 'Fişi gördük, mutfağı o gün kapattık.' })
      .expect(201);
    const detail = await request(app.getHttpServer()).get(`/restaurants/${venue.body.id}`).expect(200);
    expect(detail.body.reports[0].replies[0].body).toContain('mutfağı');
    expect(detail.body.reports[0].replies[0].onBehalf).toBe(false);
    await request(app.getHttpServer())
      .post(`/reports/${filed.body.id}/withdraw`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(201);
    const after = await request(app.getHttpServer()).get(`/restaurants/${venue.body.id}`).expect(200);
    expect(after.body.reports).toHaveLength(0);
    const audit = await request(app.getHttpServer())
      .get('/admin/audit')
      .set('Authorization', `Bearer ${admin.body.accessToken}`)
      .expect(200);
    expect(JSON.stringify(audit.body)).toContain('claims');
  });

  it('keeps settings on admin and moderation on moderator', async () => {
    const prisma = app.get(PrismaService);
    const hash = await bcrypt.hash('Mod1234!', 4);
    await prisma.user.create({
      data: {
        email: 'mod@example.com',
        passwordHash: hash,
        displayName: 'Mod',
        role: UserRole.MODERATOR,
        emailVerifiedAt: new Date(),
        kvkkAcceptedAt: new Date(),
        termsAcceptedAt: new Date(),
        ageConfirmedAt: new Date(),
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'mod@example.com', password: 'Mod1234!' })
      .expect(201);
    await request(app.getHttpServer())
      .put('/admin/settings/registrationOpen')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ value: 'false' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/admin/reports')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
  });

  it('enables admin totp and requires it on the next login', async () => {
    const prisma = app.get(PrismaService);
    const hash = await bcrypt.hash('Admin1234!', 4);
    await prisma.user.create({
      data: {
        email: 'totp@example.com',
        passwordHash: hash,
        displayName: 'Totp',
        role: UserRole.ADMIN,
        emailVerifiedAt: new Date(),
        kvkkAcceptedAt: new Date(),
        termsAcceptedAt: new Date(),
        ageConfirmedAt: new Date(),
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'totp@example.com', password: 'Admin1234!' })
      .expect(201);
    const setup = await request(app.getHttpServer())
      .post('/auth/2fa/setup')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/2fa/confirm')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ code: totpNow(setup.body.secret) })
      .expect(201);
    const challenged = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'totp@example.com', password: 'Admin1234!' })
      .expect(201);
    expect(challenged.body.mfaRequired).toBe(true);
    const session = await request(app.getHttpServer())
      .post('/auth/2fa/challenge')
      .send({ mfaToken: challenged.body.mfaToken, code: totpNow(setup.body.secret) })
      .expect(201);
    expect(session.body.accessToken).toEqual(expect.any(String));
  });
});
