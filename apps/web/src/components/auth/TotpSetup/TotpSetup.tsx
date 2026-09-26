'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ApiError, apiBaseUrl, postJson } from '@/lib/api/client';
import { clearSession, readSession } from '../session/session';

type Setup = { secret: string; recoveryCodes: string[] };

export function TotpSetup() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function start() {
    setError('');
    setPending(true);
    try {
      const result = await postJson<Setup>('/auth/2fa/setup', {}, true);
      setSetup(result);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kurulum başlamadı.');
    } finally {
      setPending(false);
    }
  }

  async function confirm() {
    const oldToken = readSession()?.accessToken ?? '';
    setError('');
    setPending(true);
    try {
      await postJson('/auth/2fa/confirm', { code }, true);
      const response = await fetch(new URL('/auth/me', apiBaseUrl()), {
        headers: { Accept: 'application/json', Authorization: `Bearer ${oldToken}` },
      });
      clearSession();
      setSetup(null);
      if (response.status === 401) setInfo('Eski oturum kapandı. Yeniden girişte kod istenir.');
      else setInfo('İki adım açıldı. Yeniden giriş yap.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kod onaylanmadı.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-4xl font-semibold">İki adım</h1>
      <p className="text-sm text-muted">Sır adres çubuğuna yazılmaz. Onay eski oturumu kapatır.</p>
      {setup ? (
        <>
          <p className="text-sm">Bu kodu şimdi kaydet. Sayfa yenilenince tekrar gösterilmez.</p>
          <code className="block break-all rounded-xl bg-card p-3" data-testid="totp-secret">
            {setup.secret}
          </code>
          <label className="block text-sm font-medium" htmlFor="totp-code">
            Uygulamadaki kod
            <input
              id="totp-code"
              className="field mt-1"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              minLength={6}
              maxLength={6}
            />
          </label>
          <button className="btn btn-primary" type="button" disabled={pending || code.length < 6} onClick={() => void confirm()}>
            Kodu onayla
          </button>
        </>
      ) : (
        <button className="btn btn-primary" type="button" disabled={pending} onClick={() => void start()}>
          Kurulumu başlat
        </button>
      )}
      {info ? (
        <p className="text-sm text-moss" data-testid="old-session-rejected">
          {info}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-chili" role="alert">
          {error}
        </p>
      ) : null}
      <Link href="/giris" className="text-sm underline">
        Girişe dön
      </Link>
    </div>
  );
}
