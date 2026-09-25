import Link from 'next/link';
import type { RestaurantListResponse } from '@/lib/types/restaurant';
import { RestaurantCard } from './RestaurantCard';

export function Leaderboard({
  data,
  q,
  city,
}: {
  data: RestaurantListResponse;
  q?: string;
  city?: string;
}) {
  const filtering = Boolean(q || city);
  return (
    <div>
      <p className="text-[11px] tracking-[0.22em] text-chili uppercase">Anti-menü</p>
      <h1 className="mt-2 max-w-3xl font-display text-4xl leading-[1.05] font-semibold sm:text-6xl">
        Önce şikayet, sonra çatal.
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Övgü sıraları tok karınla yazılır. Burada hijyen, zehirlenme şüphesi, şaibeli hesap, kaba hizmet,
        soğuk tabak ve yanıltıcı reklam en kötüden başlar.
      </p>

      <form action="/" className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="sr-only" htmlFor="city">
          Şehir
        </label>
        <select id="city" name="city" defaultValue={city ?? ''} className="field sm:max-w-52">
          <option value="">Tüm şehirler</option>
          {data.cities.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="q">
          Ara
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Mekan, mutfak, semt"
          maxLength={60}
          className="field"
        />
        <button className="btn btn-primary" type="submit">
          Süz
        </button>
        {filtering ? (
          <Link href="/" className="text-sm underline decoration-chili underline-offset-4">
            Süzgeci temizle
          </Link>
        ) : null}
      </form>

      {data.items.length === 0 ? (
        <p className="mt-10 rounded-2xl border border-dashed border-line bg-card px-5 py-8 text-muted">
          Bu süzgeçte mekan yok. Ya herkes uslu, ya da arama çok dar.
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
