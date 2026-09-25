import { FirstRunTip } from '@/components/site/FirstRunTip/FirstRunTip';
import type { RestaurantListResponse } from '@/lib/types/restaurant';
import { LocationFilter } from '../LocationFilter/LocationFilter';
import { RestaurantCard } from './RestaurantCard';

export function Leaderboard({
  data,
  q,
  city,
  district,
}: {
  data: RestaurantListResponse;
  q?: string;
  city?: string;
  district?: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-amber-ink">Mekanları keşfet — kararını kolaylaştır</p>
      <p className="mt-3 text-[11px] tracking-[0.22em] text-chili uppercase">Anti-menü</p>
      <h1 className="mt-2 max-w-3xl font-display text-4xl leading-[1.05] font-semibold sm:text-6xl">
        Önce şikayet, sonra çatal.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Övgü sıraları tok karınla yazılır. Burada hijyen, zehirlenme şüphesi, şaibeli hesap, kaba hizmet,
        soğuk tabak ve yanıltıcı reklam en kötüden başlar.
      </p>

      <FirstRunTip />
      <LocationFilter locations={data.locations ?? []} q={q} city={city} district={district} />

      {data.items.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-line bg-card px-5 py-8 text-muted" role="status">
          Bu süzgeçte mekan yok. Şehir veya aramayı genişlet, ya da ilk mekanı sen ekle.
        </p>
      ) : (
        <ol className="mt-8 space-y-3">
          {data.items.map((restaurant, index) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} rank={index + 1} />
          ))}
        </ol>
      )}
    </div>
  );
}
