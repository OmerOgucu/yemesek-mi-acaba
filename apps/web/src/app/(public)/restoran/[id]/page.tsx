import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RestaurantDetail } from '@/components/restaurant/RestaurantDetail/RestaurantDetail';
import { ApiUnavailable } from '@/components/site/ApiUnavailable/ApiUnavailable';
import { ApiError, getRestaurant } from '@/lib/api/client';

const loadRestaurant = cache(async (id: string) => getRestaurant(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const restaurant = await loadRestaurant(id);
    return { title: restaurant.name };
  } catch {
    return { title: 'Mekan' };
  }
}

export default async function RestaurantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const restaurant = await loadRestaurant(id);
    return <RestaurantDetail restaurant={restaurant} />;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return <ApiUnavailable />;
  }
}
