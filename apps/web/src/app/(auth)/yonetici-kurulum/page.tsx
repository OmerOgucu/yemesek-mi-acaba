import type { Metadata } from 'next';
import { AdminSetupForm } from '@/components/auth/AdminSetupForm/AdminSetupForm';

export const metadata: Metadata = { title: 'Yönetici kurulumu', robots: { index: false, follow: false } };

export default function AdminSetupPage() {
  return <AdminSetupForm />;
}
