import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PNG, codeFrom, waitMail } from './mail';
import { acceptRegister } from './register';
import { totpCode } from './totp';

const ids = JSON.parse(readFileSync('ops/state/e2e-ids.json', 'utf8')) as {
  email: string;
  venueId: string;
  reportId: string;
};
const adminEmail = process.env.ADMIN_EMAIL || 'admin@yemesek.test';
const setupSecret = process.env.ADMIN_SETUP_SECRET || '';

test('admin invite, totp, moderation, closed city, and account delete', async ({ browser, page }) => {
  if (setupSecret.length < 16) throw new Error('ADMIN_SETUP_SECRET missing');
  const other = `uye-b-${Date.now()}@yemesek.test`;
  await page.goto('/kayit');
  await page.locator('#displayName').fill('Uye B');
  await page.locator('#email').fill(other);
  await page.locator('#password').fill('Sifre1234');
  await acceptRegister(page);
  await page.getByRole('button', { name: 'Hesap aç' }).click();
  await expect(page.locator('#code')).toBeVisible();
  const verification = await waitMail(other, 'doğrulama');
  await page.locator('#code').fill(codeFrom(verification.text));
  await page.getByRole('button', { name: 'Doğrula' }).click();
  await expect(page.getByText('E-posta doğrulandı.')).toBeVisible();

  const token = await page.evaluate(() => window.localStorage.getItem('yemesek.access'));
  const denied = await page.request.get(`https://api.yemesek.test:8444/media/receipts/${ids.reportId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(denied.status()).toBe(404);

  await page.goto('/restoran/yeni');
  await page.locator('#name').fill('Ankara Lokanta');
  await page.locator('#city').fill('Ankara');
  await page.locator('#district').fill('Cankaya');
  await page.getByRole('button', { name: 'Mekanı ekle' }).click();
  await expect(page.getByRole('alert')).toBeVisible();

  await page.goto('/yonetici-kurulum');
  await page.locator('#admin-email').fill(adminEmail);
  await page.locator('#admin-name').fill('Gorevli');
  await page.locator('#admin-password').fill('Admin1234a');
  await page.locator('#setup-secret').fill(setupSecret);
  await page.getByRole('button', { name: 'Yöneticiyi kur' }).click();
  await expect(page.getByText('Yönetici kuruldu.')).toBeVisible();
  expect(page.url()).not.toContain('setupSecret');

  await page.goto('/giris');
  await page.locator('#email').fill(adminEmail);
  await page.locator('#password').fill('Admin1234a');
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.goto('/iki-adim');
  await page.getByRole('button', { name: 'Kurulumu başlat' }).click();
  const secret = (await page.getByTestId('totp-secret').textContent())?.trim() ?? '';
  expect(secret.length).toBeGreaterThan(10);
  await page.locator('#totp-code').fill(totpCode(secret));
  await page.getByRole('button', { name: 'Kodu onayla' }).click();
  await expect(page.getByTestId('old-session-rejected')).toContainText('Eski oturum kapandı');

  await page.goto('/giris');
  await page.locator('#email').fill(adminEmail);
  await page.locator('#password').fill('Admin1234a');
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await page.locator('#mfa-code').fill(totpCode(secret));
  await page.getByRole('button', { name: 'Doğrula' }).click();
  await page.goto('/admin/moderasyon');
  await expect(page.getByText('Tezgah kirliydi')).toBeVisible();
  await page.getByRole('button', { name: 'Onayla' }).first().click();
  await expect(page.getByText('Bekleyen şikayet yok.')).toBeVisible();

  await page.goto(`/restoran/${ids.venueId}`);
  await expect(page.getByText('Tezgah kirliydi')).toBeVisible();
  await page.goto('/admin/ayarlar');
  const cities = page.locator('#allowedCities');
  await cities.fill('izmir');
  await cities.locator('xpath=ancestor::form').getByRole('button', { name: 'Kaydet' }).click();
  await expect(page.getByText('Ayar kaydedildi.')).toBeVisible();
  await page.goto(`/restoran/${ids.venueId}`);
  await expect(page.getByRole('heading', { name: 'Bu masa boş.' })).toBeVisible();

  const owner = await browser.newPage({ storageState: 'ops/state/e2e-user.json' });
  await owner.goto('/profil');
  await expect(owner.getByText('düğmeye basınca dosyalar anında yok olmaz')).toBeVisible();
  await owner.locator('#delete-password').fill('YeniSifre123');
  await owner.getByRole('button', { name: 'Hesabımı sil' }).click();
  await owner.waitForURL((url) => url.pathname === '/');
});
