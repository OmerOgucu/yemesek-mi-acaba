import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PNG, codeFrom, tokenFrom, waitMail } from './mail';

const email = `uye-${Date.now()}@yemesek.test`;
const password = 'YeniSifre123';

test('register, verify, reset, and file a report', async ({ page }) => {
  await page.goto('/kayit');
  await page.locator('#displayName').fill('Uye A');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('Sifre1234');
  await page.getByText('18 yaşından büyüğüm.').click();
  await page.getByText('okudum.').click();
  await page.getByText('kabul ediyorum.').click();
  await page.getByRole('button', { name: 'Hesap aç' }).click();
  await expect(page.getByRole('heading', { name: 'E-postanı doğrula' })).toBeVisible();

  const verification = await waitMail(email, 'doğrulama');
  await page.locator('#code').fill(codeFrom(verification.text));
  await page.getByRole('button', { name: 'Doğrula' }).click();
  await expect(page.getByText('E-posta doğrulandı.')).toBeVisible();

  await page.goto('/sifre-sifirla');
  await page.getByPlaceholder('E-posta').fill(email);
  await page.getByRole('button', { name: 'Bağlantı iste' }).click();
  const reset = await waitMail(email, 'Parola');
  await page.getByPlaceholder('Jeton').fill(tokenFrom(reset.text));
  await page.getByPlaceholder('Yeni parola').fill(password);
  await page.getByRole('button', { name: 'Parolayı kaydet' }).click();
  await expect(page.getByText('Parola değişti.')).toBeVisible();

  await page.goto('/giris');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/giris'));

  await page.goto('/restoran/yeni');
  await page.locator('#name').fill('CI Lokanta');
  await page.locator('#city').fill('İstanbul');
  await page.locator('#district').fill('Kadikoy');
  await page.getByRole('button', { name: 'Mekanı ekle' }).click();
  await page.waitForURL(/\/restoran\/.+/);
  const venueId = page.url().split('/').pop() ?? '';
  expect(venueId.length).toBeGreaterThan(4);

  const created = page.waitForResponse((response) => response.url().includes('/reports') && response.request().method() === 'POST');
  await page.locator('#title').fill('Tezgah kirliydi');
  await page.locator('#body').fill('Tezgahın üstü silinmemişti ve tabaklar lekeli duruyordu.');
  await page.locator('#photos').setInputFiles({ name: 'yemek.png', mimeType: 'image/png', buffer: PNG });
  await page.locator('#receipt').setInputFiles({ name: 'fis.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Şikayeti bırak' }).click();
  const response = await created;
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { id: string };
  await expect(page.getByText('Şikayet düştü.')).toBeVisible();

  mkdirSync('ops/state', { recursive: true });
  writeFileSync('ops/state/e2e-ids.json', JSON.stringify({ email, venueId, reportId: body.id }));
  await page.context().storageState({ path: 'ops/state/e2e-user.json' });
});
