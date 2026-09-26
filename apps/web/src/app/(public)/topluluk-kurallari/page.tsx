import type { Metadata } from 'next';
import { apiBaseUrl } from '@/lib/api/client';

export const metadata: Metadata = { title: 'Topluluk kuralları' };

export default async function GuidelinesPage() {
  let body = 'Kurallar yüklenemedi.';
  try {
    const response = await fetch(new URL('/content/guidelines', apiBaseUrl()), { cache: 'no-store' });
    if (response.ok) body = ((await response.json()) as { body: string }).body;
  } catch {
    body = 'Kurallar şu an okunamıyor.';
  }
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl font-semibold">Topluluk kuralları</h1>
      <p className="mt-6 whitespace-pre-wrap leading-relaxed">{body}</p>
    </article>
  );
}
