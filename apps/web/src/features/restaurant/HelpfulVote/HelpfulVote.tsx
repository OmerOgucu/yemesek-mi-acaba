'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { readSession } from '@/features/auth/session/session';
import { ApiError, postJson } from '@/lib/api/client';

export function HelpfulVote({ reportId, initialCount }: { reportId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const sync = () => setSignedIn(Boolean(readSession()));
    sync();
    window.addEventListener('yemesek-auth', sync);
    return () => window.removeEventListener('yemesek-auth', sync);
  }, []);

  async function onVote() {
    setPending(true);
    setError('');
    try {
      const result = await postJson<{ helpfulCount: number; alreadyVoted: boolean }>(
        `/reports/${reportId}/votes`,
        {},
        true,
      );
      setCount(result.helpfulCount);
      setVoted(true);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Oy kaydedilemedi.');
    } finally {
      setPending(false);
    }
  }

  if (!signedIn) {
    return (
      <Link href="/giris" className="text-sm underline">
        Oy için giriş yap · {count}
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={onVote} disabled={pending || voted}>
        {voted ? `Yararlı · ${count}` : `Yararlı buldum · ${count}`}
      </button>
      {error ? <p className="text-xs text-chili">{error}</p> : null}
    </div>
  );
}
