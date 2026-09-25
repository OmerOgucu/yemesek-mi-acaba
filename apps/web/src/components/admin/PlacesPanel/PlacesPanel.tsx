'use client';

import { useEffect, useState } from 'react';
import { ApiError, deleteJson, getJson, patchJson } from '@/lib/api/client';

type Place = {
  id: string;
  name: string;
  city: string;
  hidden: boolean;
  reportCount: number;
};

export function PlacesPanel() {
  const [rows, setRows] = useState<Place[]>([]);
  const [error, setError] = useState('');

  async function load() {
    setRows(await getJson<Place[]>('/admin/restaurants', true));
  }

  useEffect(() => {
    void load().catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Mekanlar alınamadı.'));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-semibold">Mekanlar</h1>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <ul className="space-y-2">
        {rows.map((place) => (
          <li key={place.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm">
            <span>
              {place.name} · {place.city} · {place.reportCount} şikayet {place.hidden ? '· gizli' : ''}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => void patchJson(`/admin/restaurants/${place.id}`, { hidden: !place.hidden }, true).then(load)}
              >
                {place.hidden ? 'Göster' : 'Gizle'}
              </button>
              <button type="button" className="btn btn-ghost text-sm" onClick={() => void deleteJson(`/admin/restaurants/${place.id}`, true).then(load)}>
                Sil
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
