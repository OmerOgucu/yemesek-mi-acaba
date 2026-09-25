import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/LoginForm/LoginForm';

export const metadata: Metadata = { title: 'Giriş' };

export default function LoginPage() {
  return (
    <div>
      <h1 className="mb-6 text-center font-display text-4xl font-semibold">Giriş</h1>
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
