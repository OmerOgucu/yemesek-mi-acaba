import { join } from 'path';

export type AppConfig = {
  nodeEnv: string;
  isProduction: boolean;
  databaseUrl: string;
  jwtAccessSecret: string;
  port: number;
  uploadsDir: string;
  brevoApiKey: string | null;
  brevoSenderEmail: string;
  brevoSenderName: string;
  appPublicUrl: string;
  emailVerificationTtlMinutes: number;
};

export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
}

export function readConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!databaseUrl) throw new Error('DATABASE_URL tanımlı değil.');
  if (!jwtAccessSecret) throw new Error('JWT_ACCESS_SECRET tanımlı değil.');

  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT geçersiz.');
  }

  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const ttl = Number(process.env.EMAIL_VERIFICATION_TTL_MINUTES ?? 30);
  const emailVerificationTtlMinutes = Number.isInteger(ttl) && ttl >= 5 && ttl <= 1440 ? ttl : 30;
  const brevoApiKey = process.env.BREVO_API_KEY?.trim() || null;

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    databaseUrl,
    jwtAccessSecret,
    port,
    uploadsDir: uploadsDir(),
    brevoApiKey,
    brevoSenderEmail: process.env.BREVO_SENDER_EMAIL?.trim() || 'noreply@yemesek.local',
    brevoSenderName: process.env.BREVO_SENDER_NAME?.trim() || 'Yemesek mi acaba',
    appPublicUrl: (process.env.APP_PUBLIC_URL?.trim() || 'http://localhost:3000').replace(/\/$/, ''),
    emailVerificationTtlMinutes,
  };
}
