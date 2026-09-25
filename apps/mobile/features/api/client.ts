import { clearSession, readSession, writeSession, type Session, type SessionUser } from '../auth/session';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: string[] = [],
  ) {
    super(message);
  }
}

export function apiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';
}

export function mediaUrl(path: string): string {
  return new URL(path, apiBaseUrl()).toString();
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
  const current = await readSession();
  if (!current) return false;
  const response = await fetch(`${apiBaseUrl()}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  if (!response.ok) {
    await clearSession();
    return false;
  }
  await writeSession((await response.json()) as Session);
  return true;
}

async function send(path: string, method: string, body: unknown, auth: boolean): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const session = await readSession();
    if (!session) throw new ApiError('Giriş gerekli.', 401);
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return fetch(`${apiBaseUrl()}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function request<T>(path: string, method: string, body: unknown, auth: boolean): Promise<T> {
  let response = await send(path, method, body, auth);
  if (auth && response.status === 401 && (await refreshSession())) {
    response = await send(path, method, body, auth);
  }
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export function getJson<T>(path: string, auth = false): Promise<T> {
  return request<T>(path, 'GET', undefined, auth);
}

export function postJson<T>(path: string, body: unknown, auth = false): Promise<T> {
  return request<T>(path, 'POST', body, auth);
}

export async function postForm<T>(path: string, body: FormData, auth = false): Promise<T> {
  const send = async () => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (auth) {
      const session = await readSession();
      if (!session) throw new ApiError('Giriş gerekli.', 401);
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return fetch(`${apiBaseUrl()}${path}`, { method: 'POST', headers, body });
  };
  let response = await send();
  if (auth && response.status === 401 && (await refreshSession())) {
    response = await send();
  }
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export type { SessionUser };
