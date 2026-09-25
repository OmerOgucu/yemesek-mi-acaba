import type { Metadata } from 'next';
import { apiBaseUrl } from '@/lib/api/client';

export const metadata: Metadata = { title: 'Şeffaflık', robots: { index: true, follow: true } };

export default async function TransparencyPage() {
  let counts = { hiddenReports: 0, verifiedEvidence: 0, withdrawnReports: 0 };
  try {
    const response = await fetch(new URL('/transparency', apiBaseUrl()), { cache: 'no-store' });
    if (response.ok) counts = (await response.json()) as typeof counts;
  } catch {
    counts = { hiddenReports: 0, verifiedEvidence: 0, withdrawnReports: 0 };
  }
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl font-semibold">Şeffaflık</h1>
      <p className="mt-3 text-muted">Sayılar toplamdır. Kişi veya dosya içeriği burada yok.</p>
      <ul className="mt-6 space-y-2">
        <li>Gizlenen şikayet: {counts.hiddenReports}</li>
        <li>Dosyalı şikayet: {counts.verifiedEvidence}</li>
        <li>Geri çekilen şikayet: {counts.withdrawnReports}</li>
      </ul>
    </article>
  );
}
