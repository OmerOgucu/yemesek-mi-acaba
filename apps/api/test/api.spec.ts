import type { INestApplication } from '@nestjs/common';
import { ReportCategory } from '@prisma/client';
import request from 'supertest';
import { createApp } from '../src/create-app';
import { PrismaService } from '@yemesek/database';
import { resetDb } from './reset-db';
import { RECEIPT_PNG, VENUE_PNG } from '@yemesek/evidence';

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
    await resetDb(app.get(PrismaService));
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
        ageConfirmed: true,
      })
      .expect(201);
    expect(response.body.passwordHash).toBeUndefined();
    expect(response.body.user.emailVerified).toBe(false);
    expect(response.body.user.kvkkAcceptedAt).toEqual(expect.any(String));
    expect(response.body.user.termsAcceptedAt).toEqual(expect.any(String));
    expect(response.body.user.marketingAcceptedAt).toBeNull();
    const hint = await request(app.getHttpServer())
      .get('/auth/dev/verification')
      .query({ email })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/verify')
      .set('Authorization', `Bearer ${response.body.accessToken}`)
      .send({ code: hint.body.code })
      .expect(201);
    return response.body as {
      accessToken: string;
      refreshToken: string;
      user: { id: string; email: string };
    };
  }

  function withEvidence(token: string, restaurantId: string) {
    return request(app.getHttpServer())
      .post(`/restaurants/${restaurantId}/reports`)
      .set('Authorization', `Bearer ${token}`)
      .attach('photos', VENUE_PNG, { filename: 'yemek.png', contentType: 'image/png' })
      .attach('receipt', RECEIPT_PNG, { filename: 'fis.png', contentType: 'image/png' });
  }

  let venueSeq = 0;

  async function createRestaurant(name = 'Test Lokantası', city = 'Ankara', token?: string) {
    const accessToken = token ?? (await register(`mekan-${venueSeq += 1}@example.com`, 'Mekan')).accessToken;
    const response = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name, city, district: 'Merkez', cuisine: 'Ev yemeği', addressHint: 'çarşı içi' })
      .expect(201);
    return response.body as { id: string; evilScore: number };
  }

  it('GET /health', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.uptime).toEqual(expect.any(Number));
    expect(response.body.maintenance).toBeUndefined();
    expect(response.body.mailConfigured).toBeUndefined();
    expect(response.body.minMobileVersion).toBeUndefined();
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
    const mild = await createRestaurant('Sakin Kahve', 'Ankara', author.accessToken);
    const harsh = await createRestaurant('Şüpheli Balık', 'İzmir', author.accessToken);

    await request(app.getHttpServer())
      .post(`/restaurants/${mild.id}/reports`)
      .send({
        category: ReportCategory.RUDE_SERVICE,
        severity: 2,
        title: 'Garson ters baktı',
        body: 'Sipariş gecikti, ardından kısa ve kaba bir cevap geldi.',
      })
      .expect(401);

    await withEvidence(author.accessToken, mild.id)
      .field('category', ReportCategory.RUDE_SERVICE)
      .field('severity', '2')
      .field('title', 'Garson ters baktı')
      .field('body', 'Sipariş gecikti, ardından kısa ve kaba bir cevap geldi.')
      .field('nickname', 'çay içen')
      .expect(201);

    const report = await withEvidence(author.accessToken, harsh.id)
      .field('category', ReportCategory.FOOD_POISONING)
      .field('severity', '5')
      .field('title', 'Gece rahatsızlandık')
      .field('body', 'Üç kişilik masada balık yedik, sabaha kadar mide bulantısı sürdü. Teşhis yok, şüphe var.')
      .expect(201);

    expect(report.body.nickname).toBe('Yazar');
    expect(report.body.photoUrls).toHaveLength(1);
    expect(report.body.receiptUrl).toBeUndefined();
    expect(report.body.hasReceipt).toBe(true);
    expect(report.body.photoUrls[0]).toMatch(/^\/media\/photos\//);
    expect(report.body.evidenceVerified).toBe(false);
    const photo = await request(app.getHttpServer()).get(report.body.photoUrls[0]).expect(200);
    expect(photo.headers['x-content-type-options']).toBe('nosniff');
    expect(photo.headers['content-type']).toMatch(/image\/png/);
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
    expect(list.body.cities).toEqual(['Ankara', 'İzmir']);

    const detail = await request(app.getHttpServer()).get(`/restaurants/${harsh.id}`).expect(200);
    expect(detail.body.reports).toHaveLength(1);
    expect(detail.body.reports[0].helpfulCount).toBe(1);
    expect(detail.body.reports[0].receiptUrl).toBeUndefined();
    expect(detail.body.reports[0].hasReceipt).toBe(true);
    expect(detail.body.reports[0].photoUrls.length).toBeGreaterThan(0);
    expect(detail.body.evilScore).toBeGreaterThan(0);

    const filtered = await request(app.getHttpServer())
      .get('/restaurants')
      .query({ city: 'ankara', q: 'sakin' })
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

    const phone = await withEvidence(author.accessToken, restaurant.id)
      .field('category', ReportCategory.HYGIENE)
      .field('severity', '4')
      .field('title', 'Telefon yazdım diye')
      .field('body', 'Garson beni 0532 111 22 33 numarasından aradı ve bağırdı.')
      .expect(400);
    expect(phone.body.message).toBe('Gönderilen bilgiler geçersiz.');

    const missing = await request(app.getHttpServer())
      .post(`/restaurants/${restaurant.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .field('category', ReportCategory.HYGIENE)
      .field('severity', '3')
      .field('title', 'Fotoğrafsız şikayet')
      .field('body', 'Metin var ama fiş ve fotoğraf yok, bu yüzden kaydolmamalı.')
      .attach('photos', VENUE_PNG, { filename: 'yemek.png', contentType: 'image/png' })
      .expect(400);
    expect(missing.body.message).toBe('Fiş veya fatura fotoğrafı gerekli.');

    const fake = await request(app.getHttpServer())
      .post(`/restaurants/${restaurant.id}/reports`)
      .set('Authorization', `Bearer ${author.accessToken}`)
      .field('category', ReportCategory.HYGIENE)
      .field('severity', '3')
      .field('title', 'Dosya aslında metin')
      .field('body', 'Uzantısı resim gibi duran bir metin dosyası kanıt sayılmamalı.')
      .attach('photos', Buffer.from('this is not an image'), { filename: 'yemek.png', contentType: 'image/png' })
      .attach('receipt', RECEIPT_PNG, { filename: 'fis.png', contentType: 'image/png' })
      .expect(400);
    expect(fake.body.message).toBe('Yalnızca JPEG, PNG veya WebP yükleyebilirsin.');

    const listing = await request(app.getHttpServer()).get('/uploads/').expect(404);
    expect(JSON.stringify(listing.body)).not.toContain('stack');
    await request(app.getHttpServer()).get('/uploads/../package.json').expect(404);

    const extra = await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Yeni Yer', city: 'Ankara', district: 'Merkez', ownerPhone: 'gizli' })
      .expect(400);
    expect(extra.body.details.some((line: string) => line.includes('ownerPhone'))).toBe(true);

    await request(app.getHttpServer())
      .post('/restaurants')
      .set('Authorization', `Bearer ${author.accessToken}`)
      .send({ name: 'Adres Kaçağı', city: 'Ankara', district: 'Merkez', addressHint: 'Moda Cad. No: 12' })
      .expect(400);

    await request(app.getHttpServer()).get('/restaurants/no-such-id').expect(404);
  });
});
