'use client';

import { useEffect, useState } from 'react';
import { ApiError, postJson } from '@/lib/api/client';
import { getVoterKey, hasVoted, rememberVote } from '@/lib/voter/voter-key';

export function HelpfulVote({ reportId, initialCount }: { reportId: string; initialCount: number }) {
  const [count, setCount] = useState(initialCount);
  const [voted, setVoted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setVoted(hasVoted(reportId));
  }, [reportId]);

  async function onVote() {
    setPending(true);
    setError('');
    try {
      const result = await postJson<{ helpfulCount: number; alreadyVoted: boolean }>(
        `/reports/${reportId}/votes`,
        { voterKey: getVoterKey() },
      );
      setCount(result.helpfulCount);
      setVoted(true);
      rememberVote(reportId);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Oy kaydedilemedi.');
    } finally {
      setPending(false);
    }
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
