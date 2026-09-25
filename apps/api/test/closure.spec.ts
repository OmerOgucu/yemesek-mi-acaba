import type { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { readConfig } from '@yemesek/config';
import { PrismaService } from '@yemesek/database';
import { MailService } from '@yemesek/mail';
import { RECEIPT_PNG, VENUE_PNG } from '@yemesek/evidence';
import { totpNow } from '@yemesek/auth';
import { createApp } from '../src/create-app';
import { resetDb } from './reset-db';
import { bootstrapProduction } from '../../../packages/database/src/bootstrap';

describe('production closure', () => {
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
    return response.body as { accessToken: string; user: { id: string } };
  }

  it('refuses a closed city before inserting a city or district', async () => {
    const prisma = app.get(PrismaService);
    await prisma.siteSetting.create({ data: { key: 'allowedCities', value: 'istanbul' } });
    const author = await register('sehir@example.com');
    const before = await prisma.city.count();
    const response = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Kapalı', city: 'Ankara', district: 'Çankaya' })
      .expect(400);
    expect(response.body.message).toContain('şehir');
    expect(await prisma.city.count()).toBe(before);
    expect(await prisma.district.count()).toBe(0);
  });

  it('hides an existing venue after its city is closed', async () => {
    const prisma = app.get(PrismaService);
    const author = await register('kapali@example.com');
    const venue = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Açık Lokanta', city: 'Ankara', district: 'Merkez' })
      .expect(201);
    const report = await request(app.getHttpServer())
      .post(`/restaurants/${venue.body.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .field('category', 'HYGIENE')
      .field('severity', '3')
      .field('title', 'Tezgah kirliliği')
      .field('body', 'Tezgah kirliydi ve yemek soğuktu.')
      .attach('photos', VENUE_PNG, { filename: 'yemek.png', contentType: 'image/png' })
      .attach('receipt', RECEIPT_PNG, { filename: 'fis.png', contentType: 'image/png' })
      .expect(201);
    await prisma.siteSetting.upsert({
      where: { key: 'allowedCities' },
      update: { value: 'istanbul' },
      create: { key: 'allowedCities', value: 'istanbul' },
    });
    const listed = await request(app.getHttpServer()).get('/restaurants').expect(200);
    expect(listed.body.items.some((item: { id: string }) => item.id === venue.body.id)).toBe(false);
    await request(app.getHttpServer()).get(`/restaurants/${venue.body.id}`).expect(404);
    await request(app.getHttpServer())
      .post(`/restaurants/${venue.body.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .field('category', 'HYGIENE')
      .field('severity', '3')
      .field('title', 'İkinci şikayet')
      .field('body', 'Kapalı şehirde yeni şikayet açılmamalı.')
      .attach('photos', VENUE_PNG, { filename: 'yemek.png', contentType: 'image/png' })
      .attach('receipt', RECEIPT_PNG, { filename: 'fis.png', contentType: 'image/png' })
      .expect(404);
    await request(app.getHttpServer())
      .post(`/reports/${report.body.id}/votes`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/reports/${report.body.id}/replies`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ body: 'Bu yanıt kapalı şehirde yazılmamalı.' })
      .expect(404);
    await request(app.getHttpServer()).get(report.body.photoUrls[0]).expect(404);
    expect(await prisma.vote.count()).toBe(0);
    expect(await prisma.reportReply.count()).toBe(0);
  });

  it('keeps the receipt off the public document and off other users', async () => {
    const author = await register('fis@example.com');
    const other = await register('baskasi@example.com');
    const venue = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Fiş Lokantası', city: 'Ankara', district: 'Merkez' })
      .expect(201);
    const report = await request(app.getHttpServer())
      .post(`/restaurants/${venue.body.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .field('category', 'HYGIENE')
      .field('severity', '3')
      .field('title', 'Tezgah kirliliği')
      .field('body', 'Tezgah kirliydi ve yemek soğuktu.')
      .field('nickname', 'Yazar')
      .attach('photos', VENUE_PNG, { filename: 'yemek.png', contentType: 'image/png' })
      .attach('receipt', RECEIPT_PNG, { filename: 'fis.png', contentType: 'image/png' })
      .expect(201);
    expect(report.body.receiptUrl).toBeUndefined();
    expect(JSON.stringify(report.body)).not.toContain('evidence/');
    expect(report.body.hasReceipt).toBe(true);
    expect(report.body.photoUrls[0]).toMatch(/^\/media\/photos\//);
    await request(app.getHttpServer()).get('/uploads/reports/fis.png').expect(404);
    await request(app.getHttpServer()).get(report.body.photoUrls[0]).expect(200);
    await request(app.getHttpServer()).get(`/media/receipts/${report.body.id}`).expect(401);
    await request(app.getHttpServer())
      .get(`/media/receipts/${report.body.id}`)
      .set('Authorization', `Bearer ${other.accessToken}`)
      .expect(404);
    const own = await request(app.getHttpServer())
      .get(`/media/receipts/${report.body.id}`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(200);
    expect(own.headers['cache-control']).toContain('no-store');
  });

  it('does not reset admin password or settings on a second bootstrap', async () => {
    const prisma = app.get(PrismaService);
    const env = {
      INITIAL_ADMIN_EMAIL: 'kurucu@example.com',
      INITIAL_ADMIN_SETUP_SECRET: 'setup-secret-16chars',
      INITIAL_ALLOWED_CITIES: 'ankara,istanbul',
    };
    expect(await bootstrapProduction(prisma, env)).toBe('invite_ready');
    const setup = await request(app.getHttpServer())
      .post('/auth/admin/setup')
      .send({
        email: 'kurucu@example.com',
        setupSecret: 'setup-secret-16chars',
        password: 'Yonetici123',
        displayName: 'Kurucu',
      })
      .expect(201);
    expect(setup.body.accessToken).toBeUndefined();
    const before = await prisma.user.findUnique({ where: { email: 'kurucu@example.com' } });
    await prisma.siteSetting.update({ where: { key: 'allowedCities' }, data: { value: 'izmir' } });
    expect(await bootstrapProduction(prisma, { ...env, INITIAL_ADMIN_SETUP_SECRET: 'another-secret-16c' })).toBe(
      'already_complete',
    );
    const after = await prisma.user.findUnique({ where: { email: 'kurucu@example.com' } });
    expect(after?.passwordHash).toBe(before?.passwordHash);
    expect(after?.role).toBe(UserRole.ADMIN);
    expect((await prisma.siteSetting.findUnique({ where: { key: 'allowedCities' } }))?.value).toBe('izmir');
    expect(await prisma.restaurant.count()).toBe(0);
    await request(app.getHttpServer())
      .post('/auth/admin/setup')
      .send({
        email: 'kurucu@example.com',
        setupSecret: 'setup-secret-16chars',
        password: 'Yonetici123',
        displayName: 'Kurucu',
      })
      .expect(401);
  });

  it('rejects an old admin session after TOTP and a token that skipped the challenge', async () => {
    const prisma = app.get(PrismaService);
    await prisma.siteSetting.create({ data: { key: 'admin2faRequired', value: 'true' } });
    const hash = await bcrypt.hash('Admin1234!', 4);
    const admin = await prisma.user.create({
      data: {
        email: 'gorevli@example.com',
        passwordHash: hash,
        displayName: 'Görevli',
        role: UserRole.ADMIN,
        emailVerifiedAt: new Date(),
        kvkkAcceptedAt: new Date(),
        termsAcceptedAt: new Date(),
        ageConfirmedAt: new Date(),
      },
    });
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'gorevli@example.com', password: 'Admin1234!' })
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
    await request(app.getHttpServer())
      .get('/admin/ops')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .expect(401);
    const challenged = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'gorevli@example.com', password: 'Admin1234!' })
      .expect(201);
    const session = await request(app.getHttpServer())
      .post('/auth/2fa/challenge')
      .send({ mfaToken: challenged.body.mfaToken, code: totpNow(setup.body.secret) })
      .expect(201);
    await request(app.getHttpServer())
      .get('/admin/ops')
      .set('Authorization', `Bearer ${session.body.accessToken}`)
      .expect(200);
    const current = await prisma.user.findUnique({ where: { id: admin.id } });
    const jwt = app.get(JwtService);
    const skipped = await jwt.signAsync(
      { sub: admin.id, tv: current?.tokenVersion ?? 0 },
      { secret: readConfig().jwtAccessSecret, expiresIn: '5m', algorithm: 'HS256' },
    );
    await request(app.getHttpServer()).get('/admin/ops').set('Authorization', `Bearer ${skipped}`).expect(403);
  });

  it('expires a mail job instead of sending it late', async () => {
    const prisma = app.get(PrismaService);
    await prisma.mailJob.create({
      data: {
        dedupeKey: 'expired-job',
        toEmail: 'kisi@example.com',
        subject: 'Doğrulama',
        textBody: 'kod gövdesi',
        htmlBody: '<p>kod gövdesi</p>',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const sent = await app.get(MailService).processDue(5);
    expect(sent).toBe(0);
    const row = await prisma.mailJob.findUnique({ where: { dedupeKey: 'expired-job' } });
    expect(row?.status).toBe('EXPIRED');
  });

  it('ignores a spoofed forwarding header when the proxy hop count is zero', async () => {
    const prisma = app.get(PrismaService);
    const previous = process.env.RATE_LIMIT_FORCE;
    process.env.RATE_LIMIT_FORCE = '1';
    const limited = await createApp();
    await limited.init();
    try {
      await request(limited.getHttpServer()).get('/restaurants').set('X-Forwarded-For', '203.0.113.50').expect(200);
      const keys = (await prisma.rateBucket.findMany()).map((row) => row.key);
      expect(keys.some((key) => key.includes('203.0.113.50'))).toBe(false);
      expect(keys.some((key) => key.startsWith('get:'))).toBe(true);
    } finally {
      await limited.close();
      if (previous === undefined) delete process.env.RATE_LIMIT_FORCE;
      else process.env.RATE_LIMIT_FORCE = previous;
    }
  });
});
