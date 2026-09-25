'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, postJson } from '@/lib/api/client';

export default function SupportPage() {
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    const data = new FormData(event.currentTarget);
    try {
      await postJson('/support', {
        name: String(data.get('name') ?? ''),
        email: String(data.get('email') ?? ''),
        subject: String(data.get('subject') ?? ''),
        body: String(data.get('body') ?? ''),
      });
      setInfo('Mesajın kayda geçti.');
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Gönderilemedi.');
    }
  }

  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl font-semibold">Destek</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-3">
        <input name="name" required minLength={2} className="field" placeholder="Ad" />
        <input name="email" required type="email" className="field" placeholder="E-posta" />
        <input name="subject" required minLength={4} className="field" placeholder="Konu" />
        <textarea name="body" required minLength={10} className="field min-h-32" placeholder="Mesaj" />
        <button className="btn btn-primary" type="submit">
          Gönder
        </button>
      </form>
      {info ? <p className="mt-3 text-sm text-moss">{info}</p> : null}
      {error ? <p className="mt-3 text-sm text-chili">{error}</p> : null}
    </article>
  );
}
