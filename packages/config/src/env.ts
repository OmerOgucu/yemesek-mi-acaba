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
  controllerName: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
};

export function publicIdentity(value: string | undefined): string | null {
  const text = value?.trim() ?? '';
  if (!text || /fill_me|change-me|changeme|example\.com|todo|proje yürütücüsü|\.local$/i.test(text)) return null;
  return text;
}

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
    controllerName: publicIdentity(process.env.PROJECT_CONTROLLER_NAME),
    contactEmail: publicIdentity(process.env.PROJECT_CONTACT_EMAIL),
    contactAddress: publicIdentity(process.env.PROJECT_CONTACT_ADDRESS),
  };
}

const PLACEHOLDER_SECRETS = new Set([
  'change-me',
  'change-me-to-a-long-random-string',
  'secret',
  'test-access-secret-not-for-production',
]);

type LaunchEnv = {
  NODE_ENV?: string;
  JWT_ACCESS_SECRET?: string;
  DATABASE_URL?: string;
  CORS_ORIGINS?: string;
  APP_PUBLIC_URL?: string;
  API_URL?: string;
  BREVO_API_KEY?: string;
  BREVO_SENDER_EMAIL?: string;
  STORAGE_DRIVER?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_ENDPOINT?: string;
  PROJECT_CONTROLLER_NAME?: string;
  PROJECT_CONTACT_EMAIL?: string;
  PROJECT_CONTACT_ADDRESS?: string;
  TRUST_PROXY_HOPS?: string;
  INITIAL_ADMIN_EMAIL?: string;
  INITIAL_ADMIN_SETUP_SECRET?: string;
  INITIAL_ALLOWED_CITIES?: string;
};

function rejectPlaceholder(value: string | undefined, label: string): string {
  const text = value?.trim() ?? '';
  if (!text || /fill_me|change-me|changeme|example\.com|todo|proje yürütücüsü/i.test(text) || text.endsWith('.local')) {
    throw new Error(`${label} production için gerçek bir değer olmalı.`);
  }
  return text;
}

function httpsOrigin(value: string | undefined, label: string): string {
  const text = rejectPlaceholder(value, label);
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error(`${label} geçerli bir https adresi olmalı.`);
  }
  if (url.protocol !== 'https:' || url.hostname === 'localhost' || url.username || url.password) {
    throw new Error(`${label} production için localhost olmayan https olmalı.`);
  }
  return url.origin;
}

/** Production refuses to boot until the operator fills real env values. Dev and test are unchanged. */
export function assertLaunchConfig(env: LaunchEnv = process.env): void {
  if (env.NODE_ENV !== 'production') return;
  const secret = env.JWT_ACCESS_SECRET?.trim() ?? '';
  if (secret.length < 32 || PLACEHOLDER_SECRETS.has(secret) || /change-me|fill_me/i.test(secret)) {
    throw new Error('JWT_ACCESS_SECRET production için en az 32 karakterlik rastgele bir değer olmalı.');
  }
  const databaseUrl = env.DATABASE_URL?.trim() ?? '';
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error('Production DATABASE_URL SQLite olamaz. Postgres bağlantısı yaz.');
  }
  const origins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!origins.length || origins.some((origin) => origin === '*' || !origin.startsWith('https://') || origin.includes('localhost'))) {
    throw new Error('CORS_ORIGINS production için virgüllü https origin listesi olmalı. Joker yok.');
  }
  for (const origin of origins) httpsOrigin(origin, 'CORS_ORIGINS');
  httpsOrigin(env.APP_PUBLIC_URL, 'APP_PUBLIC_URL');
  httpsOrigin(env.API_URL, 'API_URL');
  rejectPlaceholder(env.BREVO_API_KEY, 'BREVO_API_KEY');
  const sender = rejectPlaceholder(env.BREVO_SENDER_EMAIL, 'BREVO_SENDER_EMAIL');
  if (!sender.includes('@')) throw new Error('BREVO_SENDER_EMAIL gerçek bir adres olmalı.');
  if ((env.STORAGE_DRIVER ?? '').trim().toLowerCase() !== 's3') {
    throw new Error('STORAGE_DRIVER production için s3 olmalı. Yerel disk fiş yayını değildir.');
  }
  rejectPlaceholder(env.S3_BUCKET, 'S3_BUCKET');
  rejectPlaceholder(env.S3_ACCESS_KEY_ID, 'S3_ACCESS_KEY_ID');
  rejectPlaceholder(env.S3_SECRET_ACCESS_KEY, 'S3_SECRET_ACCESS_KEY');
  rejectPlaceholder(env.S3_ENDPOINT, 'S3_ENDPOINT');
  rejectPlaceholder(env.PROJECT_CONTROLLER_NAME, 'PROJECT_CONTROLLER_NAME');
  rejectPlaceholder(env.PROJECT_CONTACT_EMAIL, 'PROJECT_CONTACT_EMAIL');
  rejectPlaceholder(env.PROJECT_CONTACT_ADDRESS, 'PROJECT_CONTACT_ADDRESS');
  const hops = Number(env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(hops) || hops < 0 || hops > 5 || env.TRUST_PROXY_HOPS?.trim() === '') {
    throw new Error('TRUST_PROXY_HOPS production için 0 ile 5 arasında yazılmalı.');
  }
  rejectPlaceholder(env.INITIAL_ADMIN_EMAIL, 'INITIAL_ADMIN_EMAIL');
  const setup = env.INITIAL_ADMIN_SETUP_SECRET?.trim() ?? '';
  if (setup.length < 16 || /fill_me|change-me/i.test(setup)) {
    throw new Error('INITIAL_ADMIN_SETUP_SECRET en az 16 karakter olmalı.');
  }
  if (!env.INITIAL_ALLOWED_CITIES?.trim()) {
    throw new Error('INITIAL_ALLOWED_CITIES boş olamaz. Production bütün şehirleri açmaz.');
  }
}
