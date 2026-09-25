'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'yemesek.cookies';
export const COOKIE_EVENT = 'yemesek-cookies-open';

type Prefs = { necessary: true; analytics: boolean; marketing: boolean; updatedAt: string };

function readPrefs(): Prefs | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Prefs;
    if (typeof parsed.analytics !== 'boolean' || typeof parsed.marketing !== 'boolean') return null;
    return { necessary: true, analytics: parsed.analytics, marketing: parsed.marketing, updatedAt: parsed.updatedAt };
  } catch {
    return null;
  }
}

function writePrefs(analytics: boolean, marketing: boolean) {
  const prefs: Prefs = { necessary: true, analytics, marketing, updatedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(prefs));
}

export function CookieNotice() {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const saved = readPrefs();
    setOpen(!saved);
    if (saved) {
      setAnalytics(saved.analytics);
      setMarketing(saved.marketing);
    }
    const openPanel = () => {
      const current = readPrefs();
      setAnalytics(current?.analytics ?? false);
      setMarketing(current?.marketing ?? false);
      setPanel(true);
      setOpen(true);
    };
    window.addEventListener(COOKIE_EVENT, openPanel);
    return () => window.removeEventListener(COOKIE_EVENT, openPanel);
  }, []);

  if (!open) return null;

  function save(nextAnalytics: boolean, nextMarketing: boolean) {
    writePrefs(nextAnalytics, nextMarketing);
    setAnalytics(nextAnalytics);
    setMarketing(nextMarketing);
    setOpen(false);
    setPanel(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card px-4 py-4 shadow-lg">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm text-muted">
          Zorunlu depolama her zaman açık: oturum jetonu. Analiz ve pazarlama çerezi şu an yok; tercih yine de bu cihazda durur.{' '}
          <Link href="/cerez-politikasi" className="underline">
            Çerez bildirimi
          </Link>
        </p>
        {panel ? (
          <fieldset className="mt-3 space-y-2 text-sm">
            <legend className="font-medium text-ink">Çerez tercihleri</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked disabled />
              Zorunlu (kapatılamaz)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={analytics} onChange={(event) => setAnalytics(event.target.checked)} />
              Analiz
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} />
              Pazarlama
            </label>
          </fieldset>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-ghost text-sm" onClick={() => save(false, false)}>
            Yalnızca gerekli
          </button>
          <button type="button" className="btn btn-ghost text-sm" onClick={() => setPanel(true)}>
            Tercihler
          </button>
          <button type="button" className="btn btn-primary text-sm" onClick={() => save(analytics, marketing)}>
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

export function CookieSettingsButton() {
  return (
    <button type="button" className="underline decoration-line underline-offset-4" onClick={() => window.dispatchEvent(new Event(COOKIE_EVENT))}>
      Çerez tercihleri
    </button>
  );
}
