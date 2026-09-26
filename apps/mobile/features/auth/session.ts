import { Platform } from 'react-native';

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

type NativeStore = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

const cleared = new Set<() => void>();

export function onSessionCleared(listener: () => void): () => void {
  cleared.add(listener);
  return () => {
    cleared.delete(listener);
  };
}

let nativeStore: Promise<NativeStore | null> | null = null;

function loadNativeStore(): Promise<NativeStore | null> {
  if (Platform.OS === 'web') return Promise.resolve(null);
  if (!nativeStore) {
    nativeStore = import('expo-secure-store')
      .then((mod) => mod as NativeStore)
      .catch(() => null);
  }
  return nativeStore;
}

async function getItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
    const secure = await loadNativeStore();
    if (!secure) return null;
    return await secure.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(key, value);
      return;
    }
    const secure = await loadNativeStore();
    if (!secure) return;
    await secure.setItemAsync(key, value);
  } catch {
    // A storage failure must not take down the screen that just signed in.
  }
}

async function deleteItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(key);
      return;
    }
    const secure = await loadNativeStore();
    if (!secure) return;
    await secure.deleteItemAsync(key);
  } catch {
    // Best effort. The in-memory session is still cleared.
  }
}

export function accessTokenFresh(token: string, now = Date.now()): boolean {
  try {
    const part = token.split('.')[1];
    if (!part) return false;
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? padded : padded + '='.repeat(4 - (padded.length % 4));
    const decoded = globalThis.atob(pad);
    const payload = JSON.parse(decoded) as { exp?: number };
    if (typeof payload.exp !== 'number') return true;
    return payload.exp * 1000 > now + 15_000;
  } catch {
    return false;
  }
}

export async function readSession(): Promise<Session | null> {
  try {
    const accessToken = await getItem(ACCESS);
    const refreshToken = await getItem(REFRESH);
    const raw = await getItem(USER);
    if (!accessToken || !refreshToken || !raw) return null;
    const user = JSON.parse(raw) as SessionUser;
    if (!user?.id || !user.email) {
      await clearSession();
      return null;
    }
    return { accessToken, refreshToken, user };
  } catch {
    return null;
  }
}

export async function writeSession(session: Session): Promise<void> {
  await setItem(ACCESS, session.accessToken);
  await setItem(REFRESH, session.refreshToken);
  await setItem(USER, JSON.stringify(session.user));
}

export async function clearSession(): Promise<void> {
  await deleteItem(ACCESS);
  await deleteItem(REFRESH);
  await deleteItem(USER);
  for (const listener of cleared) listener();
}
