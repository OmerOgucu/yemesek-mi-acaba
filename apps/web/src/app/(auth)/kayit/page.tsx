import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm/RegisterForm';

export const metadata: Metadata = { title: 'Kayıt' };

export default function RegisterPage() {
  return (
    <div>
      <p className="mb-2 text-center text-sm font-medium text-amber">Mekanları keşfet — kararını kolaylaştır</p>
      <h1 className="mb-2 text-center font-display text-4xl font-semibold">Kayıt</h1>
      <p className="mb-6 text-center text-sm text-muted">Şikayet yazmak için hesap gerekir. Liste herkese açık kalır.</p>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
