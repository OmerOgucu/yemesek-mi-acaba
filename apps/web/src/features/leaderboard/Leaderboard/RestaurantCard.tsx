import Link from 'next/link';
import type { RestaurantSummary } from '@/lib/types/restaurant';
import { ScoreSeal } from '@/features/score/ScoreSeal/ScoreSeal';

function placeLine(restaurant: RestaurantSummary): string {
  return [restaurant.district, restaurant.city, restaurant.cuisine].filter(Boolean).join(' · ');
}

export function RestaurantCard({ restaurant, rank }: { restaurant: RestaurantSummary; rank: number }) {
  return (
    <li>
      <Link
        href={`/restoran/${restaurant.id}`}
        className="flex flex-col gap-4 rounded-2xl border border-line bg-card px-4 py-4 transition hover:-translate-y-0.5 hover:border-ink/30 sm:flex-row sm:items-center"
      >
        <span className="w-8 font-display text-2xl text-muted">{rank}</span>
        <ScoreSeal score={restaurant.evilScore} label={restaurant.scoreLabel} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-2xl leading-tight">{restaurant.name}</span>
          <span className="mt-1 block text-sm text-muted">{placeLine(restaurant)}</span>
          <span className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-paper px-2 py-1">
              {restaurant.reportCount} şikayet
            </span>
            {restaurant.topCategories.map((category) => (
              <span key={category.category} className="rounded-full bg-paper px-2 py-1">
                {category.label}
              </span>
            ))}
          </span>
        </span>
      </Link>
    </li>
  );
}
