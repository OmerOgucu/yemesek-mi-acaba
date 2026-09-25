import type { UserRole } from '@prisma/client';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  emailVerified: boolean;
};

export type PublicBadge = {
  slug: string;
  name: string;
  icon: string;
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  emailVerified: boolean;
  badges: PublicBadge[];
  kvkkAcceptedAt: string;
  termsAcceptedAt: string;
  marketingAcceptedAt: string | null;
  createdAt: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};
