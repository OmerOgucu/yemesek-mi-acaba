'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { CATEGORIES, SEVERITY_OPTIONS } from '@/lib/categories/categories';
import { ApiError, postJson } from '@/lib/api/client';

const EMPTY = {
  category: 'HYGIENE',
  severity: '3',
  title: '',
  body: '',
  nickname: '',
};

export function ReportForm({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  function update(key: keyof typeof EMPTY, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setDetails([]);
    setDone(false);
    try {
      await postJson(`/restaurants/${restaurantId}/reports`, {
        category: form.category,
        severity: Number(form.severity),
        title: form.title,
        body: form.body,
        nickname: form.nickname || undefined,
      });
      setForm(EMPTY);
      setDone(true);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
        setDetails(caught.details);
      } else {
        setError('Gönderilemedi. Bağlantını kontrol et.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-ink bg-card p-5">
      <div>
        <h2 className="font-display text-3xl">Şikayet bırak</h2>
        <p className="mt-1 text-sm text-muted">
          Olanı anlat. Kişi adı, telefon, tam adres yazma. Bu bir ihbar formu değil, bir uyarı notu.
        </p>
      </div>

      <label className="block text-sm font-medium" htmlFor="category">
        Kategori
        <select
          id="category"
          className="field mt-1"
          value={form.category}
          onChange={(event) => update('category', event.target.value)}
          required
        >
          {CATEGORIES.map((category) => (
            <option key={category.id} value={category.id}>
              {category.label}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Şiddet</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-5">
          {SEVERITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`cursor-pointer rounded-xl border px-2 py-2 text-center text-sm ${
                form.severity === String(option.value) ? 'border-chili bg-chili/5' : 'border-line'
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name="severity"
                value={option.value}
                checked={form.severity === String(option.value)}
                onChange={(event) => update('severity', event.target.value)}
                required
              />
              <span className="block font-display text-xl">{option.value}</span>
              <span className="text-muted">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-medium" htmlFor="title">
        Başlık
        <input
          id="title"
          className="field mt-1"
          value={form.title}
          onChange={(event) => update('title', event.target.value)}
          minLength={8}
          maxLength={120}
          required
        />
      </label>

      <label className="block text-sm font-medium" htmlFor="body">
        Ne oldu?
        <textarea
          id="body"
          className="field mt-1 min-h-32"
          value={form.body}
          onChange={(event) => update('body', event.target.value)}
          minLength={20}
          maxLength={2000}
          required
        />
      </label>

      <label className="block text-sm font-medium" htmlFor="nickname">
        Takma ad <span className="font-normal text-muted">(isteğe bağlı)</span>
        <input
          id="nickname"
          className="field mt-1"
          value={form.nickname}
          onChange={(event) => update('nickname', event.target.value)}
          minLength={2}
          maxLength={32}
          autoComplete="off"
          placeholder="anonim"
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
      {done ? (
        <p className="text-sm text-moss" role="status">
          Şikayet düştü. Skor güncellendi.
        </p>
      ) : null}

      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? 'Gönderiliyor…' : 'Şikayeti bırak'}
      </button>
    </form>
  );
}
