export function ApiUnavailable() {
  return (
    <div className="rounded-2xl border border-dashed border-chili bg-card px-5 py-8">
      <h1 className="font-display text-3xl">Listeye şu an ulaşılamıyor.</h1>
      <p className="mt-3 max-w-xl text-muted">
        Mutfak kapalı görünüyor. API ayakta mı, migrasyon ve seed çalıştı mı bir bak. Sonra sayfayı yenile.
      </p>
    </div>
  );
}
