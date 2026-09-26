'use client';

import { useEffect, useState } from 'react';
import { ApiError, getJson, patchJson } from '@/lib/api/client';

type Ticket = { id: string; name: string; email: string; subject: string; body: string; status: string };

export default function AdminSupportPage() {
  const [rows, setRows] = useState<Ticket[]>([]);
  const [error, setError] = useState('');

  async function load() {
    setRows(await getJson<Ticket[]>('/admin/tickets', true));
  }

  useEffect(() => {
    void load().catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Kayıt yok.'));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-semibold">Destek kutusu</h1>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      <ul className="space-y-3">
        {rows.map((ticket) => (
          <li key={ticket.id} className="rounded-2xl border border-line bg-card p-4 text-sm">
            <p className="font-medium">
              {ticket.subject} · {ticket.status}
            </p>
            <p className="text-muted">
              {ticket.name} · {ticket.email}
            </p>
            <p className="mt-2">{ticket.body}</p>
            {ticket.status === 'OPEN' ? (
              <button
                type="button"
                className="btn btn-ghost mt-2 text-sm"
                onClick={() => void patchJson(`/admin/tickets/${ticket.id}`, {}, true).then(load)}
              >
                Kapat
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
