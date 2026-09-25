'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { apiBaseUrl } from '@/lib/api/client';

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    void fetch(`${apiBaseUrl()}/health`, { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { maintenance?: boolean } | null) => setMaintenance(Boolean(body?.maintenance)))
      .catch(() => setMaintenance(false));
  }, []);

  const allowed = path.startsWith('/admin') || path.startsWith('/giris') || path === '/durum';
  if (!maintenance || allowed) return children;

  return (
    <main id="icerik" className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-sm font-medium text-amber-ink">Bakım</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Kısa süre kapalıyız.</h1>
      <p className="mt-3 text-muted">Liste okunabilir. Yeni şikayet ve kayıt bakım bitene kadar kapalı. Durum: /durum</p>
    </main>
  );
}
