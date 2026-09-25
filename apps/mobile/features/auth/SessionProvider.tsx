import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { refreshStoredSession } from '../api/client';
import { accessTokenFresh, clearSession, onSessionCleared, readSession, writeSession, type Session, type SessionUser } from './session';

type SessionState = {
  user: SessionUser | null;
  ready: boolean;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (user: SessionUser) => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => onSessionCleared(() => setUser(null)), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let existing: Session | null = null;
      try {
        existing = await readSession();
      } catch {
        existing = null;
      }
      if (cancelled) return;
      if (!existing) {
        setUser(null);
        setReady(true);
        return;
      }
      if (accessTokenFresh(existing.accessToken)) {
        setUser(existing.user);
        setReady(true);
        const outcome = await refreshStoredSession();
        if (cancelled) return;
        if (outcome === 'signed-out') setUser(null);
        else if (outcome === 'ok') setUser((await readSession())?.user ?? null);
        return;
      }
      const outcome = await refreshStoredSession();
      if (cancelled) return;
      if (outcome === 'ok') setUser((await readSession())?.user ?? null);
      else setUser(null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      user,
      ready,
      async signIn(session) {
        await writeSession(session);
        setUser(session.user);
      },
      async signOut() {
        await clearSession();
        setUser(null);
      },
      async refreshUser(next) {
        const current = await readSession();
        if (!current) return;
        await writeSession({ ...current, user: next });
        setUser(next);
      },
    }),
    [ready, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const value = useContext(SessionContext);
  if (!value) throw new Error('SessionProvider eksik.');
  return value;
}
