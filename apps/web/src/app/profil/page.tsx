import type { Metadata } from 'next';
import { ProfilePanel } from '@/features/auth/ProfilePanel/ProfilePanel';

export const metadata: Metadata = { title: 'Profil' };

export default function ProfilePage() {
  return <ProfilePanel />;
}
