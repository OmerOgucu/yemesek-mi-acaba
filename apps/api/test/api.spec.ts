import type { INestApplication } from '@nestjs/common';
import { ReportCategory } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/create-app';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Yemesek API', () => {
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
    await prisma.report.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.restaurant.deleteMany();
  });

  async function register(email = 'yazar@example.com', displayName = 'Yazar') {
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
    expect(response.body.passwordHash).toBeUndefined();
    expect(response.body.user.kvkkAcceptedAt).toEqual(expect.any(String));
    expect(response.body.user.termsAcceptedAt).toEqual(expect.any(String));
    expect(response.body.user.marketingAcceptedAt).toBeNull();
    return response.body as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string };
    };
  }

  async function createRestaurant(name = 'Test Lokantası', city = 'İstanbul') {
    const response = await request(app.getHttpServer())
      .post('/restaurants')
      .send({ name, city, district: 'Kadıköy', cuisine: 'Ev yemeği', addressHint: 'Moda sahil' })
      .expect(201);
    return response.body as { id: string; evilScore: number };
  }

  it('GET /health', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', service: 'yemesek-api' });
  });

  it('allows the local Next origin and ignores other origins', async () => {
    const allowed = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://localhost:3000');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');

    const blocked = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'https://evil.example');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('requires consent, then lets a logged-in user file a report and another user vote', async () => {
    const refused = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'eksik@example.com',
        password: 'Sifre1234',
        displayName: 'Eksik',
        acceptKvkk: false,
        acceptTerms: true,
      })
      .expect(400);
    expect(JSON.stringify(refused.body)).not.toContain('stack');

    const author = await register();
    const loggedIn = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'yazar@example.com', password: 'Sifre1234' })
      .expect(201);
    expect(loggedIn.body.accessToken).toEqual(expect.any(String));
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'yazar@example.com', password: 'yanlis999' })
      .expect(401);
    const reader = await register('okur@example.com', 'Okur');
    const mild = await createRestaurant('Sakin Kahve', 'Girne');
    const harsh = await createRestaurant('Şüpheli Balık', 'İstanbul');

    await request(app.getHttpServer())
      .post(`/restaurants/${mild.id}/reports`)
      .send({
        category: ReportCategory.RUDE_SERVICE,
        severity: 2,
        title: 'Garson ters baktı',
        body: 'Sipariş gecikti, ardından kısa ve kaba bir cevap geldi.',
      })
      .expect(401);

    await request(app.getHttpServer())
      .post(`/restaurants/${mild.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({
        category: ReportCategory.RUDE_SERVICE,
        severity: 2,
        title: 'Garson ters baktı',
        body: 'Sipariş gecikti, ardından kısa ve kaba bir cevap geldi.',
        nickname: 'çay içen',
      })
      .expect(201);

    const report = await request(app.getHttpServer())
      .post(`/restaurants/${harsh.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({
        category: ReportCategory.FOOD_POISONING,
        severity: 5,
        title: 'Gece rahatsızlandık',
        body: 'Üç kişilik masada balık yedik, sabaha kadar mide bulantısı sürdü. Teşhis yok, şüphe var.',
      })
      .expect(201);

    expect(report.body.nickname).toBe('Yazar');
    expect(report.body.categoryLabel).toBe('Gıda zehirlenmesi şüphesi');
    expect(JSON.stringify(report.body)).not.toContain(author.user.email);

    await request(app.getHttpServer()).post(`/reports/${report.body.id}/votes`).expect(401);
    await request(app.getHttpServer())
      .post(`/reports/${report.body.id}/votes`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .expect(400);

    const vote = await request(app.getHttpServer())
      .post(`/reports/${report.body.id}/votes`)
      .set('Authorization', `Bearer ${reader.accessToken}`)
      .expect(201);
    expect(vote.body).toEqual({ helpfulCount: 1, alreadyVoted: false });

    const again = await request(app.getHttpServer())
      .post(`/reports/${report.body.id}/votes`)
      .set('Authorization', `Bearer ${reader.accessToken}`)
      .expect(201);
    expect(again.body).toEqual({ helpfulCount: 1, alreadyVoted: true });

    const refreshed = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: reader.refreshToken })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken: reader.refreshToken })
      .expect(401);
    const me = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshed.body.accessToken}`)
      .expect(200);
    expect(me.body.email).toBe('okur@example.com');

    const list = await request(app.getHttpServer()).get('/restaurants').expect(200);
    expect(list.body.total).toBe(2);
    expect(list.body.items[0].id).toBe(harsh.id);
    expect(list.body.items[0].evilScore).toBeGreaterThan(list.body.items[1].evilScore);
    expect(list.body.cities).toEqual(['Girne', 'İstanbul']);

    const detail = await request(app.getHttpServer()).get(`/restaurants/${harsh.id}`).expect(200);
    expect(detail.body.reports).toHaveLength(1);
    expect(detail.body.reports[0].helpfulCount).toBe(1);
    expect(detail.body.evilScore).toBeGreaterThan(0);

    const filtered = await request(app.getHttpServer())
      .get('/restaurants')
      .query({ city: 'girne', q: 'sakin' })
      .expect(200);
    expect(filtered.body.items.map((item: { id: string }) => item.id)).toEqual([mild.id]);
  });

  it('rejects invalid reports, doxxing, and unknown fields', async () => {
    const restaurant = await createRestaurant();
    const author = await register('denetci@example.com', 'Denetçi');

    const invalid = await request(app.getHttpServer())
      .post(`/restaurants/${restaurant.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ category: 'NOPE', severity: 9, title: 'kısa', body: 'az' })
      .expect(400);
    expect(invalid.body.statusCode).toBe(400);
    expect(invalid.body.details.join(' ')).not.toMatch(/stack/i);
    expect(JSON.stringify(invalid.body)).not.toContain('at ');

    const phone = await request(app.getHttpServer())
      .post(`/restaurants/${restaurant.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({
        category: ReportCategory.HYGIENE,
        severity: 4,
        title: 'Telefon yazdım diye',
        body: 'Garson beni 0532 111 22 33 numarasından aradı ve bağırdı.',
      })
      .expect(400);
    expect(phone.body.message).toBe('Gönderilen bilgiler geçersiz.');

    const extra = await request(app.getHttpServer())
      .post('/restaurants')
      .send({ name: 'Yeni Yer', city: 'Lefkoşa', ownerPhone: 'gizli' })
      .expect(400);
    expect(extra.body.details.some((line: string) => line.includes('ownerPhone'))).toBe(true);

    await request(app.getHttpServer())
      .post('/restaurants')
      .send({ name: 'Adres Kaçağı', city: 'İstanbul', addressHint: 'Moda Cad. No: 12' })
      .expect(400);

    await request(app.getHttpServer()).get('/restaurants/no-such-id').expect(404);
  });
});
