'use client';

/* Local file previews are blob URLs, which next/image does not load. */
/* eslint-disable @next/next/no-img-element */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { CATEGORIES, SEVERITY_OPTIONS } from '@/lib/categories/categories';
import { ApiError, postForm } from '@/lib/api/client';
import { readSession } from '@/components/auth/session/session';

const EMPTY = {
  category: 'HYGIENE',
  severity: '3',
  title: '',
  body: '',
  nickname: '',
};

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 5 * 1024 * 1024;

type LocalImage = { file: File; preview: string };

function readImages(list: FileList | null, limit: number): { files: LocalImage[]; rejected: string } {
  if (!list?.length) return { files: [], rejected: '' };
  const accepted: LocalImage[] = [];
  let rejected = '';
  for (const file of list) {
    if (!IMAGE_TYPES.has(file.type) || file.size > MAX_BYTES) {
      rejected = 'Yalnızca 5 MB altı JPEG, PNG veya WebP.';
      continue;
    }
    if (accepted.length < limit) accepted.push({ file, preview: URL.createObjectURL(file) });
  }
  return { files: accepted, rejected };
}

export function ReportForm({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [details, setDetails] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [photos, setPhotos] = useState<LocalImage[]>([]);
  const [receipt, setReceipt] = useState<LocalImage | null>(null);

  function replacePhotos(next: LocalImage[]) {
    setPhotos((current) => {
      for (const image of current) URL.revokeObjectURL(image.preview);
      return next;
    });
  }

  function replaceReceipt(next: LocalImage | null) {
    setReceipt((current) => {
      if (current) URL.revokeObjectURL(current.preview);
      return next;
    });
  }

  useEffect(() => {
    const sync = () => setSignedIn(Boolean(readSession()));
    sync();
    window.addEventListener('yemesek-auth', sync);
    return () => window.removeEventListener('yemesek-auth', sync);
  }, []);

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
      const payload = new FormData();
      payload.set('category', form.category);
      payload.set('severity', form.severity);
      payload.set('title', form.title);
      payload.set('body', form.body);
      if (form.nickname) payload.set('nickname', form.nickname);
      for (const photo of photos) payload.append('photos', photo.file);
      if (receipt) payload.append('receipt', receipt.file);
      await postForm(`/restaurants/${restaurantId}/reports`, payload, true);
      setForm(EMPTY);
      replacePhotos([]);
      replaceReceipt(null);
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

  if (signedIn === null) return null;

  if (signedIn === false) {
    const next = encodeURIComponent(`/restoran/${restaurantId}`);
    return (
      <div className="rounded-2xl border border-ink bg-card p-5">
        <h2 className="font-display text-3xl">Şikayet için giriş</h2>
        <p className="mt-2 text-sm text-muted">Liste herkese açık. Yazmak için hesabın olmalı.</p>
        <div className="mt-4 flex gap-2">
          <Link href={`/giris?donus=${next}`} className="btn btn-primary text-sm">
            Giriş
          </Link>
          <Link href={`/kayit?donus=${next}`} className="btn btn-ghost text-sm">
            Kayıt
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-ink bg-card p-5">
      <div>
        <h2 className="font-display text-3xl">Şikayet bırak</h2>
        <p className="mt-1 text-sm text-muted">
          Fotoğraf ve fiş olmadan şikayet açılmaz. Fişte ad, telefon ve kart numarasını karala. Kişi adı ve tam adres yazma.
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

      <label className="block text-sm font-medium" htmlFor="photos">
        Yemek veya mekan fotoğrafı
        <input
          id="photos"
          className="mt-1 block w-full text-sm"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(event) => {
            const picked = readImages(event.target.files, 3);
            replacePhotos(picked.files);
            setError(picked.rejected);
          }}
        />
        <span className="mt-1 block text-xs font-normal text-muted">En az 1, en fazla 3. JPEG, PNG veya WebP, dosya başı 5 MB.</span>
      </label>
      {photos.length ? (
        <ul className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <li key={photo.preview}>
              <img src={photo.preview} alt="" className="h-20 w-20 rounded-xl object-cover" />
            </li>
          ))}
        </ul>
      ) : null}

      <label className="block text-sm font-medium" htmlFor="receipt">
        Fiş veya fatura
        <input
          id="receipt"
          className="mt-1 block w-full text-sm"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const picked = readImages(event.target.files, 1);
            replaceReceipt(picked.files[0] ?? null);
            setError(picked.rejected);
          }}
        />
      </label>
      {receipt ? <img src={receipt.preview} alt="Fiş önizlemesi" className="h-20 w-20 rounded-xl object-cover" /> : null}

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

      <button className="btn btn-primary" type="submit" disabled={pending || photos.length === 0 || !receipt}>
        {pending ? 'Gönderiliyor…' : 'Şikayeti bırak'}
      </button>
    </form>
  );
}
