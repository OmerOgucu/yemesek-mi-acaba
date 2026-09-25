import Link from 'next/link';

export default function RestaurantNotFound() {
  return (
    <div className="max-w-xl">
      <p className="text-[11px] tracking-[0.22em] text-chili uppercase">404</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Bu masa boş.</h1>
      <p className="mt-3 text-muted">Aradığın mekan listede yok ya da adres yanlış.</p>
      <Link href="/" className="btn btn-primary mt-6 inline-flex">
        Kara listeye dön
      </Link>
    </div>
  );
}
