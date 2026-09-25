import { clearSession, readSession, writeSession, type SessionUser } from '@/components/auth/session/session';
import type { ApiErrorBody, RestaurantDetail, RestaurantListResponse } from '../types/restaurant';

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
  return process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
}

export function mediaUrl(path: string): string {
  return new URL(path, apiBaseUrl()).toString();
}

async function readError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    const message = body.message || 'İstek tamamlanamadı.';
    return new ApiError(message, response.status, body.details ?? []);
  } catch {
    return new ApiError('İstek tamamlanamadı.', response.status);
  }
}

export async function getRestaurants(params: {
  q?: string;
  city?: string;
}): Promise<RestaurantListResponse> {
  const url = new URL('/restaurants', apiBaseUrl());
  if (params.q) url.searchParams.set('q', params.q);
  if (params.city) url.searchParams.set('city', params.city);
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as RestaurantListResponse;
}

export async function getRestaurant(id: string): Promise<RestaurantDetail> {
  const response = await fetch(new URL(`/restaurants/${id}`, apiBaseUrl()), { cache: 'no-store' });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as RestaurantDetail;
}

async function refreshSession(): Promise<boolean> {
  const current = readSession();
  if (!current) return false;
  const response = await fetch(new URL('/auth/refresh', apiBaseUrl()), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refreshToken: current.refreshToken }),
  });
  if (!response.ok) {
    clearSession();
    return false;
  }
  const body = (await response.json()) as {
    accessToken: string;
    refreshToken: string;
    user: SessionUser;
  };
  writeSession(body);
  return true;
}

async function send(path: string, method: string, body: unknown, auth: boolean): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const session = readSession();
    if (!session) throw new ApiError('Giriş gerekli.', 401);
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return fetch(new URL(path, apiBaseUrl()), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function withAuth(path: string, method: string, body: unknown, auth: boolean): Promise<Response> {
  try {
    let response = await send(path, method, body, auth);
    if (auth && response.status === 401 && (await refreshSession())) {
      response = await send(path, method, body, auth);
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('İstek tamamlanamadı.', 0);
  }
}

async function sendForm(path: string, body: FormData, auth: boolean): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (auth) {
    const session = readSession();
    if (!session) throw new ApiError('Giriş gerekli.', 401);
    headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return fetch(new URL(path, apiBaseUrl()), { method: 'POST', headers, body });
}

export async function postForm<T>(path: string, body: FormData, auth = false): Promise<T> {
  try {
    let response = await sendForm(path, body, auth);
    if (auth && response.status === 401 && (await refreshSession())) {
      response = await sendForm(path, body, auth);
    }
    if (!response.ok) throw await readError(response);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('İstek tamamlanamadı.', 0);
  }
}

export async function postJson<T>(path: string, body: unknown, auth = false): Promise<T> {
  const response = await withAuth(path, 'POST', body, auth);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export async function getJson<T>(path: string, auth = false): Promise<T> {
  const response = await withAuth(path, 'GET', undefined, auth);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export async function patchJson<T>(path: string, body: unknown, auth = false): Promise<T> {
  const response = await withAuth(path, 'PATCH', body, auth);
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}
