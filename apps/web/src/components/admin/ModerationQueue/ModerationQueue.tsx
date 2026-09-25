'use client';

import { useEffect, useState } from 'react';
import { ApiError, deleteJson, getJson, patchJson, postJson } from '@/lib/api/client';

type ReportRow = {
  id: string;
  title: string;
  body: string;
  moderationStatus: string;
  hidden: boolean;
  threat?: boolean;
  restaurant: { name: string; city: string };
};

export function ModerationQueue() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [slaHours, setSlaHours] = useState(24);
  const [error, setError] = useState('');

  async function load() {
    const [list, meta] = await Promise.all([
      getJson<ReportRow[]>('/admin/reports?status=PENDING', true),
      getJson<{ slaHours: number }>('/admin/reports/meta', true),
    ]);
    setRows(list);
    setSlaHours(meta.slaHours);
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
      <p className="text-sm text-muted">Tehdit işaretli kayıtlar öne alınır. Hedef ilk bakış: {slaHours} saat.</p>
      {error ? <p className="text-sm text-chili" role="alert">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-6 text-muted" role="status">
          Bekleyen şikayet yok.
        </p>
      ) : null}
      <ul className="space-y-3">
        {rows.map((report) => (
          <li key={report.id} className="rounded-2xl border border-line bg-card p-4 text-sm">
            <p className="font-medium">
              {report.threat ? <span className="text-chili">Tehdit · </span> : null}
              {report.title}
            </p>
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
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => void postJson(`/admin/reports/${report.id}/threat`, { threat: !report.threat }, true).then(load)}
              >
                {report.threat ? 'Tehdidi kaldır' : 'Tehdit işaretle'}
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
