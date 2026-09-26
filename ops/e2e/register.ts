import { expect, type Page } from '@playwright/test';

/** Cookie banner mounts after hydration and covers the submit control. */
export async function acceptRegister(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Yalnızca gerekli' }).click();
  await page.getByRole('checkbox', { name: '18 yaşından büyüğüm.' }).check();
  await page.getByRole('checkbox', { name: /okudum\./ }).check();
  await page.getByRole('checkbox', { name: /kabul ediyorum\./ }).check();
  await expect(page.getByRole('button', { name: 'Hesap aç' })).toBeEnabled();
}
