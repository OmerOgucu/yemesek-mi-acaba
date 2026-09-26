import type { Metadata } from 'next';
import { ProfilePanel } from '@/components/auth/ProfilePanel/ProfilePanel';

export const metadata: Metadata = { title: 'Profil' };

export default function ProfilePage() {
  return <ProfilePanel />;
}
