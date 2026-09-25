import type { Metadata } from 'next';
import { RestaurantForm } from '@/features/restaurant/RestaurantForm/RestaurantForm';

export const metadata: Metadata = {
  title: 'Mekan ekle',
};

export default function NewRestaurantPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-[11px] tracking-[0.22em] text-chili uppercase">Yeni satır</p>
      <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">Listede yoksa ekle.</h1>
      <p className="mt-3 text-muted">
        Mekan adı ve şehir yeter. Semt yaz, kapı numarası yazma. Sahibin adını, telefonunu, ev adresini isteme.
      </p>
      <div className="mt-8">
        <RestaurantForm />
      </div>
    </div>
  );
}
