export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role?: 'USER' | 'MODERATOR' | 'ADMIN';
  emailVerified?: boolean;
  badges?: { slug: string; name: string; icon: string }[];
  kvkkAcceptedAt: string;
  termsAcceptedAt: string;
  marketingAcceptedAt: string | null;
  marketingWithdrawnAt?: string | null;
  createdAt: string;
};

export type Session = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

const ACCESS = 'yemesek.access';
const REFRESH = 'yemesek.refresh';
const USER = 'yemesek.user';

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readSession(): Session | null {
  const box = storage();
  if (!box) return null;
  try {
    const accessToken = box.getItem(ACCESS);
    const refreshToken = box.getItem(REFRESH);
    const raw = box.getItem(USER);
    if (!accessToken || !refreshToken || !raw) return null;
    const user = JSON.parse(raw) as SessionUser;
    if (!user?.id || !user.email) {
      clearSession();
      return null;
    }
    return { accessToken, refreshToken, user };
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  const box = storage();
  if (!box) return;
  box.setItem(ACCESS, session.accessToken);
  box.setItem(REFRESH, session.refreshToken);
  box.setItem(USER, JSON.stringify(session.user));
  window.dispatchEvent(new Event('yemesek-auth'));
}

export function clearSession(): void {
  const box = storage();
  if (!box) return;
  box.removeItem(ACCESS);
  box.removeItem(REFRESH);
  box.removeItem(USER);
  window.dispatchEvent(new Event('yemesek-auth'));
}

export function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}
