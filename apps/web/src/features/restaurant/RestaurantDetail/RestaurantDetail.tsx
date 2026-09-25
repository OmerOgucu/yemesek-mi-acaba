import { HelpfulVote } from '@/features/restaurant/HelpfulVote/HelpfulVote';
import { ReportForm } from '@/features/restaurant/ReportForm/ReportForm';
import { ScoreSeal } from '@/features/score/ScoreSeal/ScoreSeal';
import { severityLabel } from '@/lib/categories/categories';
import type { RestaurantDetail as RestaurantDetailData } from '@/lib/types/restaurant';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(iso),
  );
}

export function RestaurantDetail({ restaurant }: { restaurant: RestaurantDetailData }) {
  const place = [restaurant.addressHint, restaurant.district, restaurant.city].filter(Boolean).join(', ');
  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <p className="text-sm text-muted">{place}</p>
        <div className="mt-3 flex items-start gap-4">
          <ScoreSeal score={restaurant.evilScore} label={restaurant.scoreLabel} />
          <div>
            <h1 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">{restaurant.name}</h1>
            {restaurant.cuisine ? <p className="mt-1 text-muted">{restaurant.cuisine}</p> : null}
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Kötülük skoru; şiddetin kategori ağırlığıyla çarpılıp toplanması, şikayet sayısı ve yararlı
          oylardan gelir. Zehirlenme şüphesi ve hijyen daha ağır basar. Yüksek skor daha kötüdür.
        </p>
        <p className="mt-3 text-sm">
          {restaurant.reportCount} şikayet · {restaurant.helpfulVotes} yararlı oy
        </p>

        <h2 className="mt-10 font-display text-3xl">Şikayetler</h2>
        {restaurant.reports.length === 0 ? (
          <p className="mt-4 text-muted">Henüz şikayet yok. İlk notu sen düş, ama uydurma.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {restaurant.reports.map((report) => (
              <li key={report.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-display text-2xl">{report.title}</h3>
                  <p className="text-sm text-chili">
                    {report.severity}/5 · {severityLabel(report.severity)}
                  </p>
                </div>
                <p className="mt-1 text-xs tracking-wide text-muted uppercase">
                  {report.categoryLabel} · {report.nickname} · {formatDate(report.createdAt)}
                </p>
                <p className="mt-3 leading-relaxed">{report.body}</p>
                <div className="mt-4">
                  <HelpfulVote reportId={report.id} initialCount={report.helpfulCount} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
      <ReportForm restaurantId={restaurant.id} />
    </article>
  );
}
