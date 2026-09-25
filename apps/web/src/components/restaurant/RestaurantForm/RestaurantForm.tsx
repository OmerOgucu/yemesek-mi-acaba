'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ApiError, postJson } from '@/lib/api/client';
import { readSession } from '@/components/auth/session/session';

const EMPTY = {
  name: '',
  city: '',
  district: '',
  addressHint: '',
  cuisine: '',
};

export function RestaurantForm() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [gate, setGate] = useState<'loading' | 'anon' | 'unverified' | 'ok'>('loading');

  useEffect(() => {
    const user = readSession()?.user;
    if (!user) setGate('anon');
    else if (user.emailVerified !== true) setGate('unverified');
    else setGate('ok');
  }, []);

  function update(key: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setDetails([]);
    try {
      const created = await postJson<{ id: string }>('/restaurants', {
        name: form.name,
        city: form.city,
        district: form.district || undefined,
        addressHint: form.addressHint || undefined,
        cuisine: form.cuisine || undefined,
      }, true);
      router.push(`/restoran/${created.id}`);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setDetails(caught.details);
      } else {
        setError('Mekan eklenemedi. Bağlantını kontrol et.');
      }
      setPending(false);
    }
  }

  if (gate === 'loading') return null;
  if (gate === 'anon') {
    return (
      <div className="rounded-2xl border border-ink bg-card p-5">
        <h2 className="font-display text-3xl">Mekan eklemek için giriş</h2>
        <p className="mt-2 text-sm text-muted">Liste herkese açık. Yeni mekan için hesabın olmalı.</p>
        <div className="mt-4 flex gap-2">
          <Link href="/giris?donus=/restoran/yeni" className="btn btn-primary text-sm">
            Giriş
          </Link>
          <Link href="/kayit?donus=/restoran/yeni" className="btn btn-ghost text-sm">
            Kayıt
          </Link>
        </div>
      </div>
    );
  }
  if (gate === 'unverified') {
    return (
      <div className="rounded-2xl border border-ink bg-card p-5">
        <h2 className="font-display text-3xl">Önce e-postanı doğrula</h2>
        <p className="mt-2 text-sm text-muted">Mekan eklemek doğrulanmış hesaba açık.</p>
        <Link href="/dogrula?donus=/restoran/yeni" className="btn btn-primary mt-4 text-sm">
          Doğrula
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-medium" htmlFor="name">
        Mekan adı
        <input
          id="name"
          className="field mt-1"
          value={form.name}
          onChange={(event) => update('name', event.target.value)}
          minLength={2}
          maxLength={80}
          required
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium" htmlFor="city">
          Şehir
          <input
            id="city"
            className="field mt-1"
            value={form.city}
            onChange={(event) => update('city', event.target.value)}
            placeholder="Şehir adı"
            minLength={2}
            maxLength={60}
            required
          />
        </label>
        <label className="block text-sm font-medium" htmlFor="district">
          İlçe <span className="font-normal text-muted">(isteğe bağlı)</span>
          <input
            id="district"
            className="field mt-1"
            value={form.district}
            onChange={(event) => update('district', event.target.value)}
            maxLength={60}
          />
        </label>
      </div>
      <label className="block text-sm font-medium" htmlFor="cuisine">
        Mutfak <span className="font-normal text-muted">(isteğe bağlı)</span>
        <input
          id="cuisine"
          className="field mt-1"
          value={form.cuisine}
          onChange={(event) => update('cuisine', event.target.value)}
          maxLength={40}
          placeholder="Balık, döner, kafe"
        />
      </label>
      <label className="block text-sm font-medium" htmlFor="addressHint">
        Semt <span className="font-normal text-muted">(kapı numarası yok)</span>
        <input
          id="addressHint"
          className="field mt-1"
          value={form.addressHint}
          onChange={(event) => update('addressHint', event.target.value)}
          maxLength={120}
          placeholder="Moda sahil, Dereboyu, liman"
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-chili/40 bg-chili/5 px-3 py-2 text-sm text-chili-dark" role="alert">
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

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Ekleniyor…' : 'Mekanı ekle'}
      </button>
    </form>
  );
}
