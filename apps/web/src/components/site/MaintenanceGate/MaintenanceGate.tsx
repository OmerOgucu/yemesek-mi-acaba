'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { apiBaseUrl } from '@/lib/api/client';

const OPEN_DURING_MAINTENANCE = [/^\/admin(\/|$)/, /^\/giris(\/|$)/, /^\/kayit(\/|$)/, /^\/sifre-sifirla(\/|$)/, /^\/dogrula(\/|$)/];

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    void fetch(`${apiBaseUrl()}/site/maintenance`, { headers: { Accept: 'application/json' } })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { active?: boolean } | null) => setActive(Boolean(body?.active)))
      .catch(() => setActive(false));
  }, []);

  if (!active || OPEN_DURING_MAINTENANCE.some((pattern) => pattern.test(path))) return children;

  return (
    <main id="icerik" className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-display text-4xl font-semibold">Bakımdayız.</h1>
      <p className="mt-3 text-muted">Kısa süre sonra tekrar dene.</p>
    </main>
  );
}
