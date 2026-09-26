import type { Metadata } from 'next';
import { TotpSetup } from '@/components/auth/TotpSetup/TotpSetup';

export const metadata: Metadata = { title: 'İki adım', robots: { index: false, follow: false } };

export default function TotpPage() {
  return <TotpSetup />;
}
