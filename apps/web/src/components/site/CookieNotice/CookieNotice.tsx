'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const KEY = 'yemesek.notice';

export function CookieNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(localStorage.getItem(KEY) !== '1');
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink bg-card px-4 py-4">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Reklam çerezi yok. Giriş jetonu bu tarayıcının yerel deposunda durur.{' '}
          <Link href="/cerez-politikasi" className="underline">
            Çerez bildirimi
          </Link>
        </p>
        <button
          type="button"
          className="btn btn-primary text-sm"
          onClick={() => {
            localStorage.setItem(KEY, '1');
            setOpen(false);
          }}
        >
          Anladım
        </button>
      </div>
    </div>
  );
}
