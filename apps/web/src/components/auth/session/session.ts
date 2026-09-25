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

export function readSession(): Session | null {
  if (typeof window === 'undefined') return null;
  const accessToken = localStorage.getItem(ACCESS);
  const refreshToken = localStorage.getItem(REFRESH);
  const raw = localStorage.getItem(USER);
  if (!accessToken || !refreshToken || !raw) return null;
  try {
    const user = JSON.parse(raw) as SessionUser;
    if (!user?.id || !user.email) return null;
    return { accessToken, refreshToken, user };
  } catch {
    return null;
  }
}

export function writeSession(session: Session): void {
  localStorage.setItem(ACCESS, session.accessToken);
  localStorage.setItem(REFRESH, session.refreshToken);
  localStorage.setItem(USER, JSON.stringify(session.user));
  window.dispatchEvent(new Event('yemesek-auth'));
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
  localStorage.removeItem(USER);
  window.dispatchEvent(new Event('yemesek-auth'));
}

export function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
  return value;
}
