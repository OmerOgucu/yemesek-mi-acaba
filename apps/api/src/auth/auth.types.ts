export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
};

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
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
