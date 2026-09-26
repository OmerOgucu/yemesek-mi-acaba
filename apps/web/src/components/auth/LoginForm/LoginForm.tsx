'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, postJson } from '@/lib/api/client';
import { safeNext, writeSession, type Session } from '../session/session';

type LoginResult = Session | { mfaRequired: true; mfaToken: string };

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await postJson<LoginResult>('/auth/login', { email, password });
      if ('mfaRequired' in result && result.mfaRequired) {
        setMfaToken(result.mfaToken);
        setPending(false);
        return;
      }
      writeSession(result as Session);
      router.push(safeNext(params.get('donus')));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Giriş yapılamadı.');
      setPending(false);
    }
  }

  async function onMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const session = await postJson<Session>('/auth/2fa/challenge', { mfaToken, code });
      writeSession(session);
      router.push(safeNext(params.get('donus')));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kod doğrulanamadı.');
      setPending(false);
    }
  }

  const next = encodeURIComponent(safeNext(params.get('donus')));

  if (mfaToken) {
    return (
      <form onSubmit={onMfa} className="mx-auto max-w-md space-y-4">
        <h2 className="font-display text-3xl">İki adımlı doğrulama</h2>
        <label className="block text-sm font-medium" htmlFor="mfa-code">
          Doğrulama kodu
          <input
            id="mfa-code"
            className="field mt-1"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            minLength={6}
            maxLength={6}
            required
          />
        </label>
        {error ? (
          <p className="text-sm text-chili" role="alert">
            {error}
          </p>
        ) : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? 'Doğrulanıyor…' : 'Doğrula'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <label className="block text-sm font-medium" htmlFor="email">
        E-posta
        <input
          id="email"
          type="email"
          autoComplete="email"
          className="field mt-1"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'login-error' : undefined}
        />
      </label>
      <label className="block text-sm font-medium" htmlFor="password">
        Parola
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className="field mt-1"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>
      {error ? (
        <p id="login-error" className="text-sm text-chili" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Giriliyor…' : 'Giriş yap'}
      </button>
      <p className="text-sm text-muted">
        Hesabın yok mu? <Link href={`/kayit?donus=${next}`} className="underline">Kayıt ol</Link>
        {' · '}
        <Link href="/sifre-sifirla" className="underline">Parolamı unuttum</Link>
      </p>
    </form>
  );
}
