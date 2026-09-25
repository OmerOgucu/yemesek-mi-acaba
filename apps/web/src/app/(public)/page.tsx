import { ApiError, getRestaurants } from '@/lib/api/client';
import { ApiUnavailable } from '@/components/site/ApiUnavailable/ApiUnavailable';
import { Leaderboard } from '@/components/leaderboard/Leaderboard/Leaderboard';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; city?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || undefined;
  const city = params.city?.trim() || undefined;
  try {
    const data = await getRestaurants({ q, city });
    return <Leaderboard data={data} q={q} city={city} />;
  } catch (error) {
    if (!(error instanceof ApiError) && !(error instanceof Error)) {
      throw error;
    }
    return <ApiUnavailable />;
  }
}
