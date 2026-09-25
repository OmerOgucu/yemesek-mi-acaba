'use client';

import { useEffect, useState } from 'react';

const KEY = 'yemesek.tip';

export function FirstRunTip() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(localStorage.getItem(KEY) !== '1');
  }, []);

  if (!open) return null;

  return (
    <aside className="mt-6 rounded-2xl border border-line bg-card px-4 py-3 text-sm">
      <p className="font-medium text-ink">Bu bir şikayet tahtası.</p>
      <p className="mt-1 text-muted">Yüksek kötülük skoru daha kötü demektir. Övgü sıralaması yoktur.</p>
      <button
        type="button"
        className="btn btn-ghost mt-3 text-sm"
        onClick={() => {
          localStorage.setItem(KEY, '1');
          setOpen(false);
        }}
      >
        Anladım, kapat
      </button>
    </aside>
  );
}
