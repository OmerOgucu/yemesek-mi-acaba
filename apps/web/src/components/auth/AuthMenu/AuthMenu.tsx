'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { postJson } from '@/lib/api/client';
import { clearSession, readSession, type SessionUser } from '../session/session';

export function AuthMenu() {
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const sync = () => setUser(readSession()?.user ?? null);
    sync();
    window.addEventListener('yemesek-auth', sync);
    return () => window.removeEventListener('yemesek-auth', sync);
  }, []);

  async function logout() {
    const session = readSession();
    if (session) {
      try {
        await postJson('/auth/logout', { refreshToken: session.refreshToken });
      } catch {
        // Local session still goes away.
      }
    }
    clearSession();
  }

  return (
    <nav className="flex flex-wrap items-center gap-2">
      <Link href="/restoran/yeni" className="btn btn-primary text-sm">
        Mekan ekle
      </Link>
      {user ? (
        <>
          <Link href="/profil" className="btn btn-ghost text-sm">
            {user.displayName}
          </Link>
          <button type="button" className="btn btn-ghost text-sm" onClick={() => void logout()}>
            Çıkış
          </button>
        </>
      ) : (
        <>
          <Link href="/giris" className="btn btn-ghost text-sm">
            Giriş
          </Link>
          <Link href="/kayit" className="btn btn-ghost text-sm">
            Kayıt
          </Link>
        </>
      )}
    </nav>
  );
}
