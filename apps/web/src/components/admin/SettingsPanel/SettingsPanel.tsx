'use client';

import { useEffect, useState } from 'react';
import { ApiError, getJson, putJson } from '@/lib/api/client';

type Setting = { key: string; value: string; label: string };

export function SettingsPanel() {
  const [rows, setRows] = useState<Setting[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    void getJson<Setting[]>('/admin/settings', true)
      .then(setRows)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Ayarlar alınamadı.'));
  }, []);

  async function save(row: Setting) {
    setError('');
    setInfo('');
    try {
      await putJson(`/admin/settings/${row.key}`, { value: row.value }, true);
      setInfo('Ayar kaydedildi.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Ayar kaydedilemedi.');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-semibold">Ayarlar</h1>
      <p className="text-sm text-muted">Kanıt uyarısı yalnızca ekranda görünür. Fotoğraf ve fiş kuralı API’de sabit kalır.</p>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {info ? <p className="text-sm text-moss">{info}</p> : null}
      {rows.map((row) => (
        <form
          key={row.key}
          className="space-y-2 rounded-2xl border border-line bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save(row);
          }}
        >
          <label className="block text-sm font-medium" htmlFor={row.key}>
            {row.label}
            {row.value === 'true' || row.value === 'false' ? (
              <select
                id={row.key}
                className="field mt-1"
                value={row.value}
                onChange={(event) => setRows((current) => current.map((item) => (item.key === row.key ? { ...item, value: event.target.value } : item)))}
              >
                <option value="true">Açık</option>
                <option value="false">Kapalı</option>
              </select>
            ) : (
              <textarea
                id={row.key}
                className="field mt-1"
                value={row.value}
                onChange={(event) => setRows((current) => current.map((item) => (item.key === row.key ? { ...item, value: event.target.value } : item)))}
              />
            )}
          </label>
          <button type="submit" className="btn btn-primary text-sm">
            Kaydet
          </button>
        </form>
      ))}
    </div>
  );
}
