'use client';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-chili bg-card px-5 py-8">
      <h1 className="font-display text-3xl">Bu sayfa açılamadı.</h1>
      <p className="mt-3 text-muted">Bağlantı koptu ya da beklenmeyen bir hata oldu. Sayfa beyaz kalmaz.</p>
      <button type="button" className="btn btn-primary mt-6" onClick={() => reset()}>
        Tekrar dene
      </button>
    </div>
  );
}
