'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, postJson } from '@/lib/api/client';

export function AdminSetupForm() {
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await postJson('/auth/admin/setup', {
        email: String(data.get('email') ?? ''),
        displayName: String(data.get('displayName') ?? ''),
        password: String(data.get('password') ?? ''),
        setupSecret: String(data.get('setupSecret') ?? ''),
      });
      setInfo('Yönetici kuruldu. Oturum açılmadı. Parolayla giriş yap, sonra iki adımı aç.');
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Kurulum tamamlanamadı.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-4xl font-semibold">Yönetici kurulumu</h1>
      <p className="text-sm text-muted">Kurulum sırrı adres çubuğuna yazılmaz. Bu form oturum açmaz.</p>
      <label className="block text-sm font-medium" htmlFor="admin-email">
        E-posta
        <input id="admin-email" name="email" type="email" autoComplete="username" required className="field mt-1" />
      </label>
      <label className="block text-sm font-medium" htmlFor="admin-name">
        Görünen ad
        <input id="admin-name" name="displayName" minLength={2} maxLength={80} required className="field mt-1" />
      </label>
      <label className="block text-sm font-medium" htmlFor="admin-password">
        Parola
        <input id="admin-password" name="password" type="password" autoComplete="new-password" minLength={8} required className="field mt-1" />
      </label>
      <label className="block text-sm font-medium" htmlFor="setup-secret">
        Kurulum sırrı
        <input id="setup-secret" name="setupSecret" type="password" autoComplete="off" minLength={16} required className="field mt-1" />
      </label>
      {info ? <p className="text-sm text-moss">{info}</p> : null}
      {error ? (
        <p className="text-sm text-chili" role="alert">
          {error}
        </p>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Kuruluyor…' : 'Yöneticiyi kur'}
      </button>
    </form>
  );
}
