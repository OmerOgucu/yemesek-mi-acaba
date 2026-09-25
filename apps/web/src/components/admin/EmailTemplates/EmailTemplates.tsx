'use client';

import { useEffect, useState } from 'react';
import { ApiError, getJson, postJson, putJson } from '@/lib/api/client';

type Template = {
  key: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  customized: boolean;
};

type Preview = { subject: string; html: string; text: string };

const LABELS: Record<string, string> = {
  email_verification: 'E-posta doğrulama',
  welcome: 'Hoş geldin',
  password_reset: 'Parola sıfırlama taslağı',
};

export function EmailTemplates() {
  const [rows, setRows] = useState<Template[]>([]);
  const [current, setCurrent] = useState<Template | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    void getJson<Template[]>('/admin/email-templates', true)
      .then((list) => {
        setRows(list);
        setCurrent(list[0] ?? null);
      })
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : 'Şablonlar alınamadı.'));
  }, []);

  async function save() {
    if (!current) return;
    setError('');
    setInfo('');
    try {
      await putJson(`/admin/email-templates/${current.key}`, {
        subject: current.subject,
        htmlBody: current.htmlBody,
        textBody: current.textBody,
      }, true);
      setInfo('Şablon kaydedildi. Gönderilen e-posta artık bunu kullanır.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Şablon kaydedilemedi.');
    }
  }

  async function showPreview() {
    if (!current) return;
    setError('');
    try {
      await save();
      const rendered = await postJson<Preview>(`/admin/email-templates/${current.key}/preview`, {
        displayName: 'Ada',
        code: '123456',
        verifyUrl: 'http://localhost:3000/dogrula?token=ornek',
      }, true);
      setPreview(rendered);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Önizleme alınamadı.');
    }
  }

  if (!current) return <p className="text-muted">Şablonlar yükleniyor…</p>;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-semibold">E-posta şablonları</h1>
      <p className="text-sm text-muted">Yer tutucular: {'{{code}}'}, {'{{verifyUrl}}'}, {'{{displayName}}'}, {'{{appName}}'}.</p>
      <div className="flex flex-wrap gap-2">
        {rows.map((row) => (
          <button key={row.key} type="button" className="btn btn-ghost text-sm" onClick={() => { setCurrent(row); setPreview(null); }}>
            {LABELS[row.key] ?? row.key}
          </button>
        ))}
      </div>
      <label className="block text-sm font-medium">
        Konu
        <input className="field mt-1" value={current.subject} onChange={(event) => setCurrent({ ...current, subject: event.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        HTML
        <textarea className="field mt-1 min-h-40 font-mono text-xs" value={current.htmlBody} onChange={(event) => setCurrent({ ...current, htmlBody: event.target.value })} />
      </label>
      <label className="block text-sm font-medium">
        Düz metin
        <textarea className="field mt-1 min-h-24" value={current.textBody} onChange={(event) => setCurrent({ ...current, textBody: event.target.value })} />
      </label>
      {error ? <p className="text-sm text-chili">{error}</p> : null}
      {info ? <p className="text-sm text-moss">{info}</p> : null}
      <div className="flex gap-2">
        <button type="button" className="btn btn-primary text-sm" onClick={() => void save()}>
          Kaydet
        </button>
        <button type="button" className="btn btn-ghost text-sm" onClick={() => void showPreview()}>
          Önizle
        </button>
      </div>
      {preview ? (
        <section className="space-y-2 rounded-2xl border border-ink bg-card p-4">
          <h2 className="font-display text-2xl">Önizleme</h2>
          <p className="text-sm">{preview.subject}</p>
          <iframe sandbox="" title="E-posta önizleme" className="h-56 w-full rounded-xl border bg-white" srcDoc={preview.html} />
          <pre className="whitespace-pre-wrap text-xs text-muted">{preview.text}</pre>
        </section>
      ) : null}
    </div>
  );
}
