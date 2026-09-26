'use client';

import { useEffect, useState } from 'react';
import { ApiError, getJson } from '@/lib/api/client';

type DashboardData = {
  members: number;
  restaurants: number;
  reports: number;
  recent: { type: string; id: string; label: string; createdAt: string }[];
};

const TYPE_LABEL: Record<string, string> = {
  user: 'Üye',
  restaurant: 'Mekan',
  report: 'Şikayet',
};

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    void getJson<DashboardData>('/admin/dashboard', true)
      .then(setData)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Özet alınamadı.'));
  }, []);

  if (error) return <p className="text-chili">{error}</p>;
  if (!data) return <p className="text-muted">Özet yükleniyor…</p>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-semibold">Özet</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['Üye', data.members],
          ['Mekan', data.restaurants],
          ['Şikayet', data.reports],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-ink bg-card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="font-display text-4xl">{value}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="font-display text-2xl">Son hareket</h2>
        <ul className="mt-3 space-y-2">
          {(data.recent ?? []).map((item) => (
            <li key={`${item.type}-${item.id}`} className="rounded-xl border border-line bg-card px-3 py-2 text-sm">
              <span className="text-muted">{TYPE_LABEL[item.type] ?? item.type}</span> · {item.label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
