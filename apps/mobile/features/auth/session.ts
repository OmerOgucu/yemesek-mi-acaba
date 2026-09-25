import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role?: 'USER' | 'ADMIN';
  emailVerified?: boolean;
  badges?: { slug: string; name: string; icon: string }[];
  kvkkAcceptedAt: string;
  termsAcceptedAt: string;
  marketingAcceptedAt: string | null;
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

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') return globalThis.localStorage?.getItem(key) ?? null;
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    globalThis.localStorage?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function readSession(): Promise<Session | null> {
  const accessToken = await getItem(ACCESS);
  const refreshToken = await getItem(REFRESH);
  const raw = await getItem(USER);
  if (!accessToken || !refreshToken || !raw) return null;
  try {
    return { accessToken, refreshToken, user: JSON.parse(raw) as SessionUser };
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
}
