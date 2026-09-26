'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiError, getJson, postJson } from '@/lib/api/client';
import { readSession, safeNext, writeSession, type SessionUser } from '../session/session';

export function VerifyEmail() {
  const router = useRouter();
  const params = useSearchParams();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [pending, setPending] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const token = params.get('token');
    setSignedIn(Boolean(readSession()));
    if (!token) return;
    setPending(true);
    void postJson<{ ok: true }>('/auth/verify-link', { token })
      .then(async () => {
        const session = readSession();
        if (session) {
          const fresh = await getJson<SessionUser>('/auth/me', true);
          writeSession({ ...session, user: fresh });
        }
        setInfo('E-posta doğrulandı.');
        router.push(safeNext(params.get('donus')));
      })
      .catch((caught) => {
        setError(caught instanceof ApiError ? caught.message : 'Bağlantı doğrulanamadı.');
      })
      .finally(() => setPending(false));
  }, [params, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const user = await postJson<SessionUser>('/auth/verify', { code }, true);
      const session = readSession();
      if (session) writeSession({ ...session, user });
      setInfo('E-posta doğrulandı.');
      router.push(safeNext(params.get('donus')));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kod doğrulanamadı.');
      setPending(false);
    }
  }

  async function resend() {
    setError('');
    setInfo('');
    try {
      await postJson('/auth/verify/resend', {}, true);
      setInfo('Yeni kod gönderildi. Yerel geliştirmede API günlüğüne de düşer.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kod gönderilemedi.');
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <p className="text-[11px] tracking-[0.22em] text-chili uppercase">Doğrulama</p>
      <h1 className="font-display text-4xl font-semibold">E-postanı doğrula</h1>
      <p className="text-sm text-muted">
        Giriş yapabilirsin. Mekan eklemek, şikayet bırakmak ve oy vermek için 6 haneli kod veya e-postadaki bağlantı gerekir.
      </p>
      {info ? <p className="text-sm text-moss">{info}</p> : null}
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {signedIn ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm font-medium" htmlFor="code">
            6 haneli kod
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="field mt-1"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              pattern="\d{6}"
              minLength={6}
              maxLength={6}
              required
            />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="btn btn-primary text-sm" disabled={pending}>
              Doğrula
            </button>
            <button type="button" className="btn btn-ghost text-sm" onClick={() => void resend()}>
              Kodu yeniden gönder
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm">
          Kod girmek için{' '}
          <Link href="/giris?donus=/dogrula" className="underline">
            giriş yap
          </Link>
          . Bağlantı tek başına da yeter.
        </p>
      )}
    </div>
  );
}
