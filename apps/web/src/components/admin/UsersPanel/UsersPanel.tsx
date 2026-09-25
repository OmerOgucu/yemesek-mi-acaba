'use client';

import { useEffect, useState } from 'react';
import { ApiError, getJson, patchJson, postJson } from '@/lib/api/client';

type UserRow = {
  id: string;
  email: string;
  displayName: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  emailVerified: boolean;
  disabled: boolean;
  contribution: {
    reportsFiled: number;
    helpfulVotesReceived: number;
    venuesAdded: number;
    helpfulVotesGiven: number;
    score: number;
  };
  badges: { icon: string; name: string }[];
};

export function UsersPanel() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState('');

  async function load(query = q) {
    setError('');
    const path = query ? `/admin/users?q=${encodeURIComponent(query)}` : '/admin/users';
    try {
      setRows(await getJson<UserRow[]>(path, true));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Üyeler alınamadı.');
    }
  }

  useEffect(() => {
    void load('');
    // Initial list only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function update(id: string, body: { role?: 'USER' | 'MODERATOR' | 'ADMIN'; disabled?: boolean }) {
    setError('');
    try {
      await patchJson(`/admin/users/${id}`, body, true);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Üye güncellenemedi.');
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-semibold">Üyeler</h1>
      <p className="text-sm text-muted">
        Katkı puanı: şikayet × 10, alınan yararlı oy × 3, eklenen mekan × 8, verilen yararlı oy × 1.
      </p>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <input className="field" value={q} onChange={(event) => setQ(event.target.value)} placeholder="E-posta veya ad" />
        <button type="submit" className="btn btn-primary text-sm">
          Ara
        </button>
      </form>
      {error ? <p className="text-sm text-chili" role="alert">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-6 text-muted" role="status">
          Bu süzgeçte üye yok.
        </p>
      ) : null}
      <ul className="space-y-3">
        {rows.map((user) => (
          <li key={user.id} className="rounded-2xl border border-line bg-card p-4 text-sm">
            <p className="font-medium">
              {user.displayName} · {user.email}
            </p>
            <p className="mt-1 text-muted">
              {user.role} · {user.emailVerified ? 'e-posta doğrulandı' : 'e-posta bekliyor'} ·{' '}
              {user.disabled ? 'askıda' : 'açık'} · katkı {user.contribution.score}
            </p>
            <p className="mt-1 text-muted">
              {user.contribution.reportsFiled} şikayet · {user.contribution.helpfulVotesReceived} alınan oy ·{' '}
              {user.contribution.venuesAdded} mekan · {user.contribution.helpfulVotesGiven} verilen oy
            </p>
            {user.badges.length ? <p className="mt-1">{user.badges.map((badge) => `${badge.icon} ${badge.name}`).join(' · ')}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost text-sm" onClick={() => void update(user.id, { disabled: !user.disabled })}>
                {user.disabled ? 'Askıyı kaldır' : 'Askıya al'}
              </button>
              <button
                type="button"
                className="btn btn-ghost text-sm"
                onClick={() => void update(user.id, { role: user.role === 'ADMIN' ? 'USER' : 'ADMIN' })}
              >
                {user.role === 'ADMIN' ? 'Üye yap' : 'Yönetici yap'}
              </button>
            </div>
            {user.role !== 'ADMIN' ? (
              <form
                className="mt-3 flex flex-wrap gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const data = new FormData(event.currentTarget);
                  void postJson(
                    `/admin/users/${user.id}/delete`,
                    { password: String(data.get('password') ?? ''), confirm: String(data.get('confirm') ?? '') },
                    true,
                  )
                    .then(() => load())
                    .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Üye silinemedi.'));
                }}
              >
                <input name="password" type="password" autoComplete="current-password" className="field max-w-40" placeholder="Parolan" aria-label="Yönetici parolası" />
                <input name="confirm" className="field max-w-48" placeholder="KULLANICIYI-SIL" aria-label="Onay metni" />
                <button type="submit" className="btn btn-ghost text-sm">
                  Üyeyi sil
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
