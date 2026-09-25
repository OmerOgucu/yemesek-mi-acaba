import type { Metadata } from 'next';
import { apiBaseUrl } from '@/lib/api/client';

export const metadata: Metadata = { title: 'Basın ve hukuk' };

export default async function PressPage() {
  let press = { email: 'basin@yemesekmiacaba.com', name: 'Yemesek basın', legalEmail: 'hukuk@yemesekmiacaba.com' };
  try {
    const response = await fetch(new URL('/press', apiBaseUrl()), { cache: 'no-store' });
    if (response.ok) press = (await response.json()) as typeof press;
  } catch {
    press = press;
  }
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl font-semibold">Basın ve hukuk</h1>
      <p className="mt-4">
        {press.name}: <a className="underline" href={`mailto:${press.email}`}>{press.email}</a>
      </p>
      <p className="mt-2">
        Kaldırma ve hukuk: <a className="underline" href={`mailto:${press.legalEmail}`}>{press.legalEmail}</a>
      </p>
      <p className="mt-4 text-sm text-muted">
        Hazır yanıt şablonları yönetim panelinde: basın sorun alındı ve kaldırma bildirimi alındı.
      </p>
    </article>
  );
}
