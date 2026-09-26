export const WEB_KEYS = [
  'NODE_ENV',
  'HOSTNAME',
  'PORT',
  'ANDROID_PACKAGE',
  'ANDROID_SHA256_CERT_FINGERPRINTS',
  'APPLE_TEAM_ID',
  'IOS_BUNDLE_ID',
];

export const API_KEYS = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'CORS_ORIGINS',
  'APP_PUBLIC_URL',
  'API_URL',
  'BREVO_API_KEY',
  'BREVO_SENDER_EMAIL',
  'BREVO_SENDER_NAME',
  'BREVO_API_URL',
  'EMAIL_VERIFICATION_TTL_MINUTES',
  'STORAGE_DRIVER',
  'S3_BUCKET',
  'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_FORCE_PATH_STYLE',
  'PROJECT_CONTROLLER_NAME',
  'PROJECT_CONTACT_EMAIL',
  'PROJECT_CONTACT_ADDRESS',
  'TRUST_PROXY_HOPS',
  'RUN_WORKER',
  'JOB_TICK_MS',
  'JOB_LEASE_MS',
  'DELETE_TIMEOUT_MS',
  'WORKER_ID',
  'UPLOADS_DIR',
];

export const BOOTSTRAP_KEYS = [
  'NODE_ENV',
  'DATABASE_URL',
  'INITIAL_ADMIN_EMAIL',
  'INITIAL_ADMIN_SETUP_SECRET',
  'INITIAL_ALLOWED_CITIES',
];

export const MIGRATE_KEYS = ['DATABASE_URL'];

export const BACKUP_KEYS = [
  'DATABASE_URL',
  'POSTGRES_USER',
  'POSTGRES_DB',
  'BACKUP_PASSPHRASE',
  'BACKUP_S3_BUCKET',
  'BACKUP_S3_ENDPOINT',
  'BACKUP_S3_ACCESS_KEY_ID',
  'BACKUP_S3_SECRET_ACCESS_KEY',
  'BACKUP_S3_REGION',
  'BACKUP_S3_PREFIX',
  'BACKUP_MAX_AGE_HOURS',
  'ALERT_WEBHOOK_URL',
  'BACKUP_FILE',
  'RESTORE_DATABASE_URL',
  'BACKUP_ID',
];

const FORBIDDEN_WEB = /^(JWT_|BREVO_|S3_|BACKUP_|INITIAL_|DATABASE_URL|POSTGRES_|RESTORE_|API_URL|APP_PUBLIC_URL|CORS_)/;

export function renderRole(env, keys) {
  const lines = [];
  for (const key of keys) {
    const value = env[key];
    if (value == null || value === '') continue;
    if (/[\r\n]/.test(value)) throw new Error(`env değeri tek satır olmalı: ${key}`);
    lines.push(`${key}=${value}`);
  }
  return `${lines.join('\n')}\n`;
}

export function assertWebIsolated(text) {
  for (const key of keysOf(text)) {
    if (FORBIDDEN_WEB.test(key)) throw new Error(`web env yasak anahtar: ${key}`);
    if (!WEB_KEYS.includes(key)) throw new Error(`web env allowlist dışı: ${key}`);
  }
}

export function keysOf(text) {
  return text
    .split('\n')
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => line.slice(0, line.indexOf('=')));
}
