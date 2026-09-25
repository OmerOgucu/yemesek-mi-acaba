'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, postJson } from '@/lib/api/client';
import { safeNext, writeSession, type Session } from '../session/session';

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const session = await postJson<Session>('/auth/login', { email, password });
      writeSession(session);
      router.push(safeNext(params.get('donus')));
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Giriş yapılamadı.');
      setPending(false);
    }
  }

  const next = encodeURIComponent(safeNext(params.get('donus')));

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
        <p className="text-sm text-chili" role="alert">
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
