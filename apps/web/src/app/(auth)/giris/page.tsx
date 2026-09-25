import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/auth/LoginForm/LoginForm';

export const metadata: Metadata = { title: 'Giriş' };

export default function LoginPage() {
  return (
    <div>
      <p className="mb-2 text-center text-sm font-medium text-amber">Mekanları keşfet — kararını kolaylaştır</p>
      <h1 className="mb-2 text-center font-display text-4xl font-semibold">Giriş</h1>
      <p className="mb-6 text-center text-sm text-muted">Liste açık. Şikayet ve oy için hesap gerekir.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
