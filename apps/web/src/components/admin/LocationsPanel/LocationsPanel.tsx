'use client';

import { useEffect, useState } from 'react';
import { ApiError, getJson, patchJson, postJson } from '@/lib/api/client';

type District = { id: string; name: string; venueCount: number };
type City = { id: string; name: string; venueCount: number; districts: District[] };

export function LocationsPanel() {
  const [rows, setRows] = useState<City[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function load() {
    setRows(await getJson<City[]>('/admin/locations', true));
  }

  useEffect(() => {
    void load().catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Konumlar alınamadı.'));
  }, []);

  async function renameCity(id: string, name: string) {
    setError('');
    setInfo('');
    try {
      await patchJson(`/admin/locations/cities/${id}`, { name }, true);
      setInfo('Şehir adı güncellendi. Liste aynı kaydı kullanır.');
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Şehir güncellenemedi.');
    }
  }

  async function renameDistrict(id: string, name: string) {
    setError('');
    setInfo('');
    try {
      await patchJson(`/admin/locations/districts/${id}`, { name }, true);
      setInfo('İlçe adı güncellendi.');
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'İlçe güncellenemedi.');
    }
  }

  async function merge(sourceId: string, intoCityId: string) {
    setError('');
    setInfo('');
    try {
      await postJson(`/admin/locations/cities/${sourceId}/merge`, { intoCityId }, true);
      setInfo('Şehirler birleşti. Mekanlar hedef konuma taşındı.');
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Birleştirilemedi.');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-semibold">Konumlar</h1>
      <p className="text-sm text-muted">
        İlk yazılan şehir ve ilçe kalıcı addır. Aynı ikili farklı yazımla gelse de yeni kova açılmaz. Ad değiştirmek web ve mobil listeyi birlikte günceller.
      </p>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {info ? <p className="text-sm text-moss">{info}</p> : null}
      {rows.map((city) => (
        <section key={city.id} className="rounded-2xl border border-line bg-card p-4">
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              void renameCity(city.id, String(data.get('name') ?? ''));
            }}
          >
            <input name="name" className="field max-w-xs" defaultValue={city.name} />
            <span className="text-sm text-muted">{city.venueCount} mekan</span>
            <button type="submit" className="btn btn-ghost text-sm">
              Şehri adlandır
            </button>
          </form>
          {rows.length > 1 ? (
            <form
              className="mt-2 flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                void merge(city.id, String(data.get('into') ?? ''));
              }}
            >
              <select name="into" className="field max-w-xs" defaultValue="">
                <option value="" disabled>
                  Birleştir…
                </option>
                {rows
                  .filter((item) => item.id !== city.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
              <button type="submit" className="btn btn-ghost text-sm">
                Bu şehri taşı
              </button>
            </form>
          ) : null}
          <ul className="mt-3 space-y-2">
            {city.districts.map((district) => (
              <li key={district.id}>
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const data = new FormData(event.currentTarget);
                    void renameDistrict(district.id, String(data.get('name') ?? ''));
                  }}
                >
                  <input name="name" className="field max-w-xs" defaultValue={district.name} />
                  <span className="text-sm text-muted">{district.venueCount} mekan</span>
                  <button type="submit" className="btn btn-ghost text-sm">
                    İlçeyi adlandır
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
