'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, postJson } from '@/lib/api/client';
import { safeNext, writeSession, type Session } from '../session/session';

export function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [acceptKvkk, setAcceptKvkk] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setDetails([]);
    try {
      const session = await postJson<Session>('/auth/register', {
        email,
        password,
        displayName,
        acceptKvkk,
        acceptTerms,
        acceptMarketing,
        ageConfirmed,
      });
      writeSession(session);
      const next = params.get('donus');
      router.push(next ? `/dogrula?donus=${encodeURIComponent(safeNext(next))}` : '/dogrula');
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setDetails(caught.details);
      } else {
        setError('Kayıt tamamlanamadı.');
      }
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <label className="block text-sm font-medium" htmlFor="displayName">
        Görünen ad
        <input
          id="displayName"
          className="field mt-1"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          minLength={2}
          maxLength={32}
          autoComplete="nickname"
          required
        />
      </label>
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
          autoComplete="new-password"
          className="field mt-1"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          maxLength={72}
          required
        />
        <span className="mt-1 block text-xs font-normal text-muted">En az 8 karakter, bir harf ve bir rakam.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={ageConfirmed}
          onChange={(event) => setAgeConfirmed(event.target.checked)}
          required
        />
        <span>18 yaşından büyüğüm.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={acceptKvkk}
          onChange={(event) => setAcceptKvkk(event.target.checked)}
          required
        />
        <span>
          <Link href="/kvkk" className="underline" target="_blank">
            KVKK aydınlatma metnini
          </Link>{' '}
          okudum.
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={acceptTerms}
          onChange={(event) => setAcceptTerms(event.target.checked)}
          required
        />
        <span>
          <Link href="/kullanim-kosullari" className="underline" target="_blank">
            Kullanım koşullarını
          </Link>{' '}
          kabul ediyorum.
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          className="mt-1"
          checked={acceptMarketing}
          onChange={(event) => setAcceptMarketing(event.target.checked)}
        />
        <span>Pazarlama iletisi için ayrıca açık rıza veriyorum. İsteğe bağlı, kaydı engellemez.</span>
      </label>
      {error ? (
        <div className="text-sm text-chili" role="alert">
          <p>{error}</p>
          {details.length ? (
            <ul className="mt-1 list-disc pl-5">
              {details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending || !acceptKvkk || !acceptTerms || !ageConfirmed}>
        {pending ? 'Kaydediliyor…' : 'Hesap aç'}
      </button>
    </form>
  );
}
