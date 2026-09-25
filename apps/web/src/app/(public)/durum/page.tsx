import type { Metadata } from 'next';
import { apiBaseUrl } from '@/lib/api/client';

export const metadata: Metadata = { title: 'Durum' };
export const dynamic = 'force-dynamic';

type Health = {
  status?: string;
  maintenance?: boolean;
  mailConfigured?: boolean;
};

export default async function StatusPage() {
  let health: Health | null = null;
  try {
    const response = await fetch(`${apiBaseUrl()}/health`, { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (response.ok) health = (await response.json()) as Health;
  } catch {
    health = null;
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-sm font-medium text-amber-ink">Herkese açık durum</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Sistem</h1>
      {health ? (
        <ul className="mt-6 space-y-2 rounded-2xl border border-line bg-card p-4 text-sm">
          <li>API: {health.status === 'ok' ? 'ayakta' : 'bilinmiyor'}</li>
          <li>Bakım: {health.maintenance ? 'açık, yazmalar kapalı' : 'kapalı'}</li>
          <li>E-posta gönderici: {health.mailConfigured ? 'yapılandırılmış' : 'yapılandırılmamış'}</li>
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-line bg-card px-5 py-8 text-muted">
          API’ye ulaşılamadı. Gizli bir ayrıntı gösterilmez.
        </p>
      )}
    </div>
  );
}
