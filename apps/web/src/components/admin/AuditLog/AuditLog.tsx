'use client';

import { useEffect, useState } from 'react';
import { ApiError, getJson } from '@/lib/api/client';

type Row = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  ip: string | null;
  createdAt: string;
  actor: { displayName: string; role: string } | null;
};

export function AuditLog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    void getJson<Row[]>('/admin/audit', true)
      .then(setRows)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Kayıt alınamadı.'));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-semibold">Denetim kaydı</h1>
      <p className="text-sm text-muted">Yönetici ve moderatör yazmaları: kim, ne, kayıt, özet, adres, zaman.</p>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-line bg-card p-3">
            <p>
              {row.actor?.displayName ?? 'bilinmeyen'} · {row.action}
            </p>
            <p className="text-muted">
              {row.entityType} {row.entityId} · {row.ip ?? 'adres yok'} · {row.createdAt}
            </p>
            <p className="mt-1">{row.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
