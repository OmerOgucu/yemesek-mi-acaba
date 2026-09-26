import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Harita', robots: { index: false, follow: false } };

export default function MapPage() {
  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="font-display text-4xl font-semibold">Harita yakında</h1>
      <p className="mt-3 text-muted">Mekanlar şimdilik şehir ve ilçe süzgecinde. Tam harita bu sürümde yok.</p>
      <Link href="/" className="mt-4 inline-block underline">
        Listeye dön
      </Link>
    </article>
  );
}
