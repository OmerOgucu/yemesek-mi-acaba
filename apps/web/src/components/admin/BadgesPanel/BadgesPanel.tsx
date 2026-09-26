'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, deleteJson, getJson, patchJson, postJson } from '@/lib/api/client';

type Badge = {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  metric: string;
  threshold: number;
  sortOrder: number;
  enabled: boolean;
};

const EMPTY = {
  slug: '',
  name: '',
  description: '',
  icon: '⭐',
  metric: 'REPORTS_FILED',
  threshold: 1,
  sortOrder: 0,
  enabled: true,
};

const METRICS = [
  ['REPORTS_FILED', 'Şikayet'],
  ['HELPFUL_VOTES_RECEIVED', 'Alınan yararlı oy'],
  ['VENUES_ADDED', 'Eklenen mekan'],
  ['HELPFUL_VOTES_GIVEN', 'Verilen yararlı oy'],
];

export function BadgesPanel() {
  const [rows, setRows] = useState<Badge[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setRows(await getJson<Badge[]>('/admin/badges', true));
  }

  useEffect(() => {
    void load().catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Rozetler alınamadı.'));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const body = { ...form, threshold: Number(form.threshold), sortOrder: Number(form.sortOrder) };
    try {
      if (editing) await patchJson(`/admin/badges/${editing}`, body, true);
      else await postJson('/admin/badges', body, true);
      setForm(EMPTY);
      setEditing(null);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Rozet kaydedilemedi.');
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-4xl font-semibold">Rozetler</h1>
      <p className="text-sm text-muted">
        Eşik düşünce otomatik verilir. Elle verilen veya geri alınan rozet, eşik değişse de otomatik olarak geri açılmaz.
      </p>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <ul className="space-y-2">
        {rows.map((badge) => (
          <li key={badge.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-card px-3 py-2 text-sm">
            <span>
              {badge.icon} {badge.name} · {badge.metric} ≥ {badge.threshold} {badge.enabled ? '' : '· kapalı'}
            </span>
            <span className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => {
                  setEditing(badge.id);
                  setForm({
                    slug: badge.slug,
                    name: badge.name,
                    description: badge.description,
                    icon: badge.icon,
                    metric: badge.metric,
                    threshold: badge.threshold,
                    sortOrder: badge.sortOrder,
                    enabled: badge.enabled,
                  });
                }}
              >
                Düzenle
              </button>
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => void deleteJson(`/admin/badges/${badge.id}`, true).then(load)}
              >
                Sil
              </button>
            </span>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl border border-ink bg-card p-4 sm:grid-cols-2">
        <input className="field" placeholder="kod" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} required />
        <input className="field" placeholder="ad" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <input className="field sm:col-span-2" placeholder="açıklama" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required />
        <input className="field" placeholder="simge" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} required />
        <select className="field" value={form.metric} onChange={(event) => setForm({ ...form, metric: event.target.value })}>
          {METRICS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input className="field" type="number" min={1} value={form.threshold} onChange={(event) => setForm({ ...form, threshold: Number(event.target.value) })} />
        <input className="field" type="number" min={0} value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />
          Açık
        </label>
        <button type="submit" className="btn btn-primary text-sm">
          {editing ? 'Eşiği kaydet' : 'Rozet ekle'}
        </button>
      </form>
    </div>
  );
}
