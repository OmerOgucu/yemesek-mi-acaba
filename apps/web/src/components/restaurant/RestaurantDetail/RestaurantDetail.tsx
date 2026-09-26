import { HelpfulVote } from '@/components/restaurant/HelpfulVote/HelpfulVote';
import { ReportEvidence } from '@/components/restaurant/ReportEvidence/ReportEvidence';
import { ReportForm } from '@/components/restaurant/ReportForm/ReportForm';
import { ScoreSeal } from '@/components/score/ScoreSeal/ScoreSeal';
import { severityLabel } from '@/lib/categories/categories';
import type { RestaurantDetail as RestaurantDetailData } from '@/lib/types/restaurant';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
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
            {restaurant.brandName ? <p className="mt-1 text-sm text-muted">Marka: {restaurant.brandName}</p> : null}
            {restaurant.status === 'CLOSED' ? (
              <p className="mt-2 inline-block rounded-full bg-chili/15 px-2 py-1 text-xs font-medium text-chili">Kapalı</p>
            ) : null}
            {restaurant.status === 'MOVED' ? (
              <p className="mt-2 inline-block rounded-full bg-paper px-2 py-1 text-xs font-medium">Taşındı</p>
            ) : null}
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          Kötülük skoru; şiddetin kategori ağırlığıyla çarpılıp toplanması, şikayet sayısı ve yararlı
          oylardan gelir. Zehirlenme şüphesi ve hijyen daha ağır basar. Yüksek skor daha kötüdür.
        </p>
        <p className="mt-3 text-sm">
          {restaurant.reportCount} şikayet · {restaurant.helpfulVotes} yararlı oy
        </p>
        {restaurant.venueReply ? (
          <p className="mt-4 rounded-2xl border border-line bg-paper px-4 py-3 text-sm">
            <span className="font-medium">İşletme yanıtı</span>
            {restaurant.venueReplyOnBehalf ? ' · işletme adına' : ''}: {restaurant.venueReply}
          </p>
        ) : null}

        <h2 className="mt-10 font-display text-3xl">Şikayetler</h2>
        {(restaurant.reports ?? []).length === 0 ? (
          <p className="mt-4 text-muted">Henüz şikayet yok. İlk not için fotoğraf ve fiş gerekir.</p>
        ) : (
          <ol className="mt-4 space-y-4">
            {(restaurant.reports ?? []).map((report) => (
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
                <ReportEvidence
                  photoUrls={report.photoUrls}
                  hasReceipt={report.hasReceipt}
                  evidenceVerified={report.evidenceVerified}
                  moderationStatus={report.moderationStatus}
                />
                {report.replies?.map((reply) => (
                  <p key={reply.createdAt} className="mt-3 rounded-xl bg-paper px-3 py-2 text-sm">
                    <span className="font-medium">{reply.onBehalf ? 'İşletme adına yanıt' : 'İşletme yanıtı'}</span>
                    : {reply.body}
                  </p>
                ))}
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
