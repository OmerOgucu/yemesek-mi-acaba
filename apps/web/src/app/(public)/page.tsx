import { ApiError, getRestaurants } from '@/lib/api/client';
import { ApiUnavailable } from '@/components/site/ApiUnavailable/ApiUnavailable';
import { Leaderboard } from '@/components/leaderboard/Leaderboard/Leaderboard';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string; district?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const city = params.city?.trim() || undefined;
  const district = params.district?.trim() || undefined;
  try {
    const data = await getRestaurants({ q, city, district });
    return <Leaderboard data={data} q={q} city={city} district={district} />;
  } catch (error) {
    if (!(error instanceof ApiError) && !(error instanceof Error)) {
      throw error;
    }
    return <ApiUnavailable />;
  }
}
