import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearSession, readSession, writeSession, type Session, type SessionUser } from './session';

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

  useEffect(() => {
    void readSession()
      .then((session) => setUser(session?.user ?? null))
      .finally(() => setReady(true));
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
