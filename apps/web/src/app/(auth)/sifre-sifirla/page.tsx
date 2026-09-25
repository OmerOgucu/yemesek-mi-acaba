'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, postJson } from '@/lib/api/client';

export default function ResetPage() {
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  async function requestLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await postJson('/auth/password-reset', { email: String(data.get('email') ?? '') });
      setInfo('Hesap varsa sıfırlama bağlantısı e-postana gider.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Gönderilemedi.');
    }
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await postJson('/auth/password-reset/confirm', {
        token: String(data.get('token') ?? ''),
        password: String(data.get('password') ?? ''),
      });
      setInfo('Parola değişti. Eski oturumlar kapandı. Giriş yap.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Parola değişmedi.');
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-8">
      <form onSubmit={requestLink} className="space-y-3">
        <p className="text-sm font-medium text-amber">Mekanları keşfet — kararını kolaylaştır</p>
        <h1 className="font-display text-4xl font-semibold">Parolayı sıfırla</h1>
        <input name="email" type="email" required className="field" placeholder="E-posta" />
        <button className="btn btn-primary" type="submit">
          Bağlantı iste
        </button>
      </form>
      <form onSubmit={confirm} className="space-y-3">
        <h2 className="font-display text-2xl">Bağlantıdaki jeton</h2>
        <input name="token" required minLength={20} className="field" placeholder="Jeton" />
        <input name="password" type="password" required minLength={8} className="field" placeholder="Yeni parola" />
        <button className="btn btn-ghost" type="submit">
          Parolayı kaydet
        </button>
      </form>
      {info ? <p className="text-sm text-moss">{info}</p> : null}
      {error ? <p className="text-sm text-chili">{error}</p> : null}
    </div>
  );
}
