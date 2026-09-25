'use client';

import { useEffect, useState } from 'react';
import { ApiError, deleteJson, getJson, patchJson } from '@/lib/api/client';

type ReportRow = {
  id: string;
  title: string;
  body: string;
  moderationStatus: string;
  hidden: boolean;
  restaurant: { name: string; city: string };
};

export function ModerationQueue() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState('');

  async function load() {
    setRows(await getJson<ReportRow[]>('/admin/reports?status=PENDING', true));
  }

  useEffect(() => {
    void load().catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Kuyruk alınamadı.'));
  }, []);

  async function act(id: string, body: { status?: string; hidden?: boolean }) {
    setError('');
    try {
      await patchJson(`/admin/reports/${id}`, body, true);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Şikayet güncellenemedi.');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-semibold">İnceleme kuyruğu</h1>
      <p className="text-sm text-muted">Bekleyen şikayetler. Onay kanıtı incelendi sayar. Ret gizler.</p>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {rows.length === 0 ? <p className="text-muted">Bekleyen şikayet yok.</p> : null}
      <ul className="space-y-3">
        {rows.map((report) => (
          <li key={report.id} className="rounded-2xl border border-line bg-card p-4 text-sm">
            <p className="font-medium">{report.title}</p>
            <p className="text-muted">
              {report.restaurant.name} · {report.restaurant.city}
            </p>
            <p className="mt-2">{report.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-primary text-sm" onClick={() => void act(report.id, { status: 'APPROVED' })}>
                Onayla
              </button>
              <button type="button" className="btn btn-ghost text-sm" onClick={() => void act(report.id, { status: 'REJECTED' })}>
                Reddet
              </button>
              <button type="button" className="btn btn-ghost text-sm" onClick={() => void act(report.id, { hidden: !report.hidden })}>
                {report.hidden ? 'Göster' : 'Gizle'}
              </button>
              <button type="button" className="btn btn-ghost text-sm" onClick={() => void deleteJson(`/admin/reports/${report.id}`, true).then(load)}>
                Sil
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
