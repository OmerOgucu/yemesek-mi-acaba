'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ApiError, getJson, patchJson, postJson } from '@/lib/api/client';
import { clearSession, readSession, writeSession, type SessionUser } from '../session/session';

type MyReport = {
  id: string;
  title: string;
  severity: number;
  createdAt: string;
  restaurant: { id: string; name: string; city: string };
};

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
}

export function ProfilePanel() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [reports, setReports] = useState<MyReport[]>([]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readSession();
    if (!session) {
      router.replace('/giris?donus=/profil');
      return;
    }
    setUser(session.user);
    void getJson<SessionUser>('/auth/me', true)
      .then((fresh) => {
        const current = readSession();
        if (current) writeSession({ ...current, user: fresh });
        setUser(fresh);
      })
      .catch(() => undefined);
    void getJson<MyReport[]>('/auth/me/reports', true)
      .then(setReports)
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, [router]);

  async function downloadExport() {
    setError('');
    try {
      const data = await getJson<unknown>('/auth/me/export', true);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'yemesek-verilerim.json';
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Veri indirilemedi.');
    }
  }

  async function setMarketing(acceptMarketing: boolean) {
    setError('');
    try {
      const fresh = await patchJson<SessionUser>('/auth/me', { acceptMarketing }, true);
      const current = readSession();
      if (current) writeSession({ ...current, user: fresh });
      setUser(fresh);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Tercih kaydedilemedi.');
    }
  }

  async function removeAccount() {
    setError('');
    try {
      await postJson('/auth/me/delete', { password }, true);
      clearSession();
      router.push('/');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Hesap silinemedi.');
    }
  }

  if (!ready || !user) return <p className="text-muted">Profil açılıyor…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-4xl font-semibold">{user.displayName}</h1>
        <p className="mt-1 text-muted">{user.email}</p>
        <p className="mt-1 text-sm text-muted">
          {user.emailVerified ? 'E-posta doğrulandı.' : 'E-posta henüz doğrulanmadı.'}{' '}
          {user.emailVerified ? null : (
            <Link href="/dogrula" className="underline">
              Doğrula
            </Link>
          )}
        </p>
        {user.badges?.length ? (
          <p className="mt-2 text-sm">{user.badges.map((badge) => `${badge.icon} ${badge.name}`).join(' · ')}</p>
        ) : null}
        <p className="mt-3 text-sm text-muted">
          Aydınlatma: {formatDate(user.kvkkAcceptedAt)} · Koşullar: {formatDate(user.termsAcceptedAt)}
        </p>
        <p className="mt-3 text-sm">
          <Link href="/nasil-calisir" className="underline">
            Nasıl çalışır?
          </Link>
        </p>
      </div>
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-display text-2xl">Pazarlama rızası</h2>
        <p className="mt-1 text-sm text-muted">
          {user.marketingAcceptedAt
            ? `Açık rıza ${formatDate(user.marketingAcceptedAt)} tarihinde verildi.`
            : user.marketingWithdrawnAt
              ? `Rıza ${formatDate(user.marketingWithdrawnAt)} tarihinde geri alındı.`
              : 'Pazarlama için açık rıza yok.'}
        </p>
        <button
          type="button"
          className="btn btn-ghost mt-3 text-sm"
          onClick={() => void setMarketing(!user.marketingAcceptedAt)}
        >
          {user.marketingAcceptedAt ? 'Rızayı geri al' : 'Açık rıza ver'}
        </button>
      </section>
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-display text-2xl">Verilerim</h2>
        <p className="mt-1 text-sm text-muted">Profil, rızalar, eklediğin mekanlar, şikayetlerin, oyların ve rozetlerin. Başkasının e-postası yok.</p>
        <button type="button" className="btn btn-primary mt-3 text-sm" onClick={() => void downloadExport()}>
          Verilerimi indir
        </button>
      </section>
      <section>
        <h2 className="font-display text-2xl">Şikayetlerim</h2>
        {reports.length === 0 ? (
          <p className="mt-2 rounded-2xl border border-dashed border-line bg-card px-4 py-6 text-muted" role="status">
            Henüz şikayetin yok. Fotoğraf ve fişle bir mekan altına yazabilirsin.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {reports.map((report) => (
              <li key={report.id}>
                <Link href={`/restoran/${report.restaurant.id}`} className="underline">
                  {report.restaurant.name}
                </Link>
                <span className="text-muted"> · {report.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-2xl border border-chili/30 p-4">
        <h2 className="font-display text-2xl">Hesabı sil</h2>
        <p className="mt-1 text-sm text-muted">
          Şikayetlerin ve oyların da silinir. Bu, KVKK kapsamındaki silme hakkının uygulama içindeki karşılığıdır.
        </p>
        <label className="mt-3 block text-sm" htmlFor="delete-password">
          Parola
          <input
            id="delete-password"
            type="password"
            className="field mt-1"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        <button type="button" className="btn btn-primary mt-3 text-sm" onClick={() => void removeAccount()}>
          Hesabımı sil
        </button>
      </section>
      {error ? (
        <p className="text-sm text-chili" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
