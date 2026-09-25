'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { readSession } from '@/components/auth/session/session';

const LINKS = [
  ['/admin', 'Özet'],
  ['/admin/kullanicilar', 'Üyeler'],
  ['/admin/rozetler', 'Rozetler'],
  ['/admin/moderasyon', 'İnceleme'],
  ['/admin/mekanlar', 'Mekanlar'],
  ['/admin/konumlar', 'Konumlar'],
  ['/admin/eposta', 'E-posta'],
  ['/admin/ayarlar', 'Ayarlar'],
  ['/admin/denetim', 'Denetim'],
  ['/admin/destek', 'Destek'],
];

export function AdminShell({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'anon' | 'forbidden' | 'ok'>('loading');
  const [role, setRole] = useState('');

  useEffect(() => {
    const user = readSession()?.user;
    if (!user) setState('anon');
    else if (user.role !== 'ADMIN' && user.role !== 'MODERATOR') setState('forbidden');
    else {
      setRole(user.role);
      setState('ok');
    }
  }, []);

  if (state === 'loading') return <p className="text-muted">Yönetim açılıyor…</p>;
  if (state === 'anon') {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-4xl">Yönetici girişi</h1>
        <Link href="/giris?donus=/admin" className="btn btn-primary mt-4 text-sm">
          Giriş
        </Link>
      </div>
    );
  }
  if (state === 'forbidden') {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-4xl">Bu alan yöneticilere açık</h1>
        <p className="mt-2 text-muted">Hesabının rolü yönetici değil.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-line bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <Image src="/brand/mark.png" alt="" width={200} height={240} className="h-10 w-auto" style={{ width: 'auto' }} />
          <p className="text-[11px] tracking-[0.22em] text-chili uppercase">Yönetim</p>
        </div>
        <nav className="mt-3 flex flex-wrap gap-2">
          {LINKS.filter(([href]) => role === 'ADMIN' || ['/admin', '/admin/moderasyon', '/admin/mekanlar', '/admin/denetim'].includes(href)).map(([href, label]) => (
            <Link key={href} href={href} className="btn btn-ghost text-sm">
              {label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
