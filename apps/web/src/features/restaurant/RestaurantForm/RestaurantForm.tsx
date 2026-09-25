'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { ApiError, postJson } from '@/lib/api/client';

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
      });
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
            placeholder="İstanbul, Girne, Lefkoşa…"
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
