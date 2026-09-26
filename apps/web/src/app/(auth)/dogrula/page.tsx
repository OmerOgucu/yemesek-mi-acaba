import { Suspense } from 'react';
import { VerifyEmail } from '@/components/auth/VerifyEmail/VerifyEmail';

export default function VerifyPage() {
  return (
    <Suspense fallback={<p className="text-muted">Doğrulama açılıyor…</p>}>
      <VerifyEmail />
    </Suspense>
  );
}
