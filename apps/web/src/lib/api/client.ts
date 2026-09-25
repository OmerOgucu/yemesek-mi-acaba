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

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(new URL(path, apiBaseUrl()), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}
