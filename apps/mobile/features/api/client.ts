import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { clearSession, readSession, writeSession, type Session, type SessionUser } from '../auth/session';

const TIMEOUT_MS = 12_000;

function appHeaders(): Record<string, string> {
  try {
    const headers: Record<string, string> = {
      'x-app-version': Constants.expoConfig?.version ?? '1.0.0',
    };
    if (Platform.OS === 'ios') headers['x-ios-build'] = Constants.expoConfig?.ios?.buildNumber ?? '1';
    if (Platform.OS === 'android') headers['x-android-build'] = String(Constants.expoConfig?.android?.versionCode ?? 1);
    return headers;
  } catch {
    return { 'x-app-version': '1.0.0' };
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function apiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  return configured || 'http://localhost:3001';
}

export function mediaUrl(path: string): string {
  try {
    return new URL(path, apiBaseUrl()).toString();
  } catch {
    return '';
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readBody<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('Sunucu beklenmeyen bir cevap verdi.', response.status);
  }
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { message?: string; details?: string[] };
    return new ApiError(body.message || 'İstek tamamlanamadı.', response.status, body.details ?? []);
  } catch {
    return new ApiError('İstek tamamlanamadı.', response.status);
  }
}

async function refreshSession(): Promise<boolean> {
  try {
    const current = await readSession();
    if (!current) return false;
    const response = await fetchWithTimeout(`${apiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ refreshToken: current.refreshToken }),
    });
    if (response.status === 401 || response.status === 403) {
      await clearSession();
      return false;
    }
    if (!response.ok) return false;
    const body = await readBody<Session>(response);
    if (!body?.accessToken || !body.refreshToken || !body.user?.id) {
      await clearSession();
      return false;
    }
    await writeSession(body);
    return true;
  } catch {
    return false;
  }
}

/** Startup restore. Network failure keeps the caller in control; a rejected refresh signs out. */
export async function refreshStoredSession(timeoutMs = 4_000): Promise<'ok' | 'signed-out' | 'offline'> {
  const current = await readSession();
  if (!current) return 'signed-out';
  try {
    const response = await fetchWithTimeout(
      `${apiBaseUrl()}/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      },
      timeoutMs,
    );
    if (response.status === 401 || response.status === 403) {
      await clearSession();
      return 'signed-out';
    }
    if (!response.ok) return 'offline';
    const body = await readBody<Session>(response);
    if (!body?.accessToken || !body.refreshToken || !body.user?.id || !body.user.email) {
      await clearSession();
      return 'signed-out';
    }
    await writeSession(body);
    return 'ok';
  } catch {
    return 'offline';
  }
}

async function send(path: string, method: string, body: unknown, auth: boolean): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json', ...appHeaders() };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const session = await readSession();
    if (!session) throw new ApiError('Giriş gerekli.', 401);
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return fetchWithTimeout(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function request<T>(path: string, method: string, body: unknown, auth: boolean): Promise<T> {
  let response: Response;
  try {
    response = await send(path, method, body, auth);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Bağlantı yok. İnterneti kontrol et.', 0);
  }
  if (auth && response.status === 401 && (await refreshSession())) {
    try {
      response = await send(path, method, body, auth);
    } catch {
      throw new ApiError('Bağlantı yok. İnterneti kontrol et.', 0);
    }
  }
  if (response.status === 401) throw new ApiError('Oturum kapandı. Tekrar gir.', 401);
  if (!response.ok) throw await readError(response);
  return readBody<T>(response);
}

export function getJson<T>(path: string, auth = false): Promise<T> {
  return request<T>(path, 'GET', undefined, auth);
}

export function postJson<T>(path: string, body: unknown, auth = false): Promise<T> {
  return request<T>(path, 'POST', body, auth);
}

export async function postForm<T>(path: string, body: FormData, auth = false): Promise<T> {
  const sendForm = async () => {
    const headers: Record<string, string> = { Accept: 'application/json', ...appHeaders() };
    if (auth) {
      const session = await readSession();
      if (!session) throw new ApiError('Giriş gerekli.', 401);
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return fetchWithTimeout(`${apiBaseUrl()}${path}`, { method: 'POST', headers, body });
  };
  try {
    let response = await sendForm();
    if (auth && response.status === 401 && (await refreshSession())) {
      response = await sendForm();
    }
    if (response.status === 401) throw new ApiError('Oturum kapandı. Tekrar gir.', 401);
    if (!response.ok) throw await readError(response);
    return readBody<T>(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Bağlantı yok. İnterneti kontrol et.', 0);
  }
}

export type { SessionUser };
