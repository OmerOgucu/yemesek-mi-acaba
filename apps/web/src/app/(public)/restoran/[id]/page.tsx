import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { RestaurantDetail } from '@/components/restaurant/RestaurantDetail/RestaurantDetail';
import { ApiUnavailable } from '@/components/site/ApiUnavailable/ApiUnavailable';
import { ApiError, getPublicSettings, getRestaurant } from '@/lib/api/client';

const loadRestaurant = cache(async (id: string) => getRestaurant(id));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const restaurant = await loadRestaurant(id);
    const settings = await getPublicSettings().catch(() => []);
    const indexReports = settings.find((row) => row.key === 'indexPublicReports')?.value === 'true';
    return {
      title: restaurant.name,
      robots: indexReports ? { index: true, follow: true } : { index: false, follow: false },
    };
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
