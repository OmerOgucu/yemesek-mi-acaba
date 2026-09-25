import type { INestApplication } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import request from 'supertest';
import { PrismaService } from '@yemesek/database';
import { createApp } from '../src/create-app';
import { resetDb } from './reset-db';

describe('maturity controls', () => {
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

  async function register(email: string, acceptMarketing = false) {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email,
        password: 'Sifre1234',
        displayName: 'Yazar',
        acceptKvkk: true,
        acceptTerms: true,
        ageConfirmed: true,
        acceptMarketing,
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

  it('exports only the caller and records marketing withdrawal', async () => {
    const author = await register('disari@example.com', true);
    const other = await register('baskasi@example.com');
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Benim Yerim', city: 'Ankara', district: 'Çankaya' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${other.accessToken}`)
      .send({ name: 'Başkasının Yeri', city: 'İzmir', district: 'Konak' })
      .expect(201);

    const exported = await request(app.getHttpServer())
      .get('/auth/me/export')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(200);
    expect(exported.body.profile.email).toBe('disari@example.com');
    expect(exported.body.profile.passwordHash).toBeUndefined();
    expect(exported.body.restaurants.map((row: { name: string }) => row.name)).toEqual(['Benim Yerim']);
    expect(JSON.stringify(exported.body)).not.toContain('baskasi@example.com');
    expect(exported.body.consents.marketingAcceptedAt).toEqual(expect.any(String));

    const withdrawn = await request(app.getHttpServer())
      .post('/auth/me/marketing')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ acceptMarketing: false })
      .expect(201);
    expect(withdrawn.body.marketingAcceptedAt).toBeNull();
    expect(withdrawn.body.marketingWithdrawnAt).toEqual(expect.any(String));
  });

  it('blocks public writes in maintenance and keeps health and admin open', async () => {
    const author = await register('bakim@example.com');
    const prisma = app.get(PrismaService);
    await prisma.user.update({ where: { id: author.user.id }, data: { role: UserRole.ADMIN } });
    await prisma.siteSetting.create({ data: { key: 'maintenanceMode', value: 'true' } });

    const health = await request(app.getHttpServer()).get('/health').expect(200);
    expect(health.body.maintenance).toBe(true);
    expect(health.body.status).toBe('ok');

    await request(app.getHttpServer()).get('/restaurants').expect(200);
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Kapalı Yazma', city: 'Ankara', district: 'Çankaya' })
      .expect(503);

    await request(app.getHttpServer())
      .put('/admin/settings/maintenanceMode')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ value: 'false' })
      .expect(200);
  });

  it('rejects a venue outside the soft-launch city list', async () => {
    const author = await register('sehir@example.com');
    await app.get(PrismaService).siteSetting.create({ data: { key: 'allowedCities', value: 'Ankara' } });
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Açık Masa', city: 'Ankara', district: 'Çankaya' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Kapalı Masa', city: 'İzmir', district: 'Konak' })
      .expect(400);
    const list = await request(app.getHttpServer()).get('/restaurants').expect(200);
    expect(list.body.items.map((row: { name: string }) => row.name)).toEqual(['Açık Masa']);
  });

  it('returns the minimum mobile version and rejects an older client header', async () => {
    const author = await register('surum@example.com');
    await app.get(PrismaService).siteSetting.create({ data: { key: 'minMobileVersion', value: '2.0.0' } });
    const health = await request(app.getHttpServer()).get('/health').expect(200);
    expect(health.body.minMobileVersion).toBe('2.0.0');
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .set('x-app-version', '1.0.0')
      .send({ name: 'Eski Uygulama', city: 'Ankara', district: 'Çankaya' })
      .expect(426);
    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Yeni Uygulama', city: 'Ankara', district: 'Çankaya' })
      .expect(201);
  });
});
