'use client';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, background: '#F9F4EA', color: '#2E2E2E', fontFamily: 'sans-serif' }}>
        <main style={{ maxWidth: 560, margin: '18vh auto', padding: 24 }}>
          <h1 style={{ fontSize: 32, marginBottom: 12 }}>Sayfa açılamadı.</h1>
          <p style={{ color: '#6A635A' }}>Beklenmeyen bir hata oldu. Tekrar dene.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: 20, background: '#8B1E1E', color: '#fff', border: 0, borderRadius: 999, padding: '10px 16px' }}
          >
            Tekrar dene
          </button>
        </main>
      </body>
    </html>
  );
}
