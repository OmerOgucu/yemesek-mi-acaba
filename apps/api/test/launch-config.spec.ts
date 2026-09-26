import { assertLaunchConfig } from '@yemesek/config';

const ready = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  DATABASE_URL: 'postgresql://app@db.internal:5432/yemesek',
  CORS_ORIGINS: 'https://yemesekmiacaba.com',
  APP_PUBLIC_URL: 'https://yemesekmiacaba.com',
  API_URL: 'https://api.yemesekmiacaba.com',
  BREVO_API_KEY: 'brevo-live-key',
  BREVO_SENDER_EMAIL: 'noreply@yemesekmiacaba.com',
  STORAGE_DRIVER: 's3',
  S3_BUCKET: 'yemesek-evidence',
  S3_ACCESS_KEY_ID: 'r2-access',
  S3_SECRET_ACCESS_KEY: 'r2-secret-value',
  S3_ENDPOINT: 'https://account.r2.cloudflarestorage.com',
  PROJECT_CONTROLLER_NAME: 'Ada Yılmaz',
  PROJECT_CONTACT_EMAIL: 'hukuk@yemesekmiacaba.com',
  PROJECT_CONTACT_ADDRESS: 'İstanbul',
  TRUST_PROXY_HOPS: '1',
  INITIAL_ADMIN_EMAIL: 'admin@yemesekmiacaba.com',
  INITIAL_ADMIN_SETUP_SECRET: 'one-time-setup-secret',
  INITIAL_ALLOWED_CITIES: 'İstanbul,Ankara',
};

describe('assertLaunchConfig', () => {
  it('allows a filled production environment', () => {
    expect(() => assertLaunchConfig(ready)).not.toThrow();
  });

  it('refuses placeholder secrets, sqlite, missing CORS, and http public URL', () => {
    expect(() => assertLaunchConfig({ ...ready, JWT_ACCESS_SECRET: 'change-me-to-a-long-random-string' })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => assertLaunchConfig({ ...ready, JWT_ACCESS_SECRET: 'short' })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => assertLaunchConfig({ ...ready, DATABASE_URL: 'file:./dev.db' })).toThrow(/SQLite/);
    expect(() => assertLaunchConfig({ ...ready, CORS_ORIGINS: '' })).toThrow(/CORS_ORIGINS/);
    expect(() => assertLaunchConfig({ ...ready, APP_PUBLIC_URL: 'http://localhost:3000' })).toThrow(/https/);
  });

  it('does not block local development', () => {
    expect(() => assertLaunchConfig({ NODE_ENV: 'development', JWT_ACCESS_SECRET: 'change-me' })).not.toThrow();
  });

  it('lets api and worker boot without bootstrap secrets', () => {
    const runtime: Record<string, string | undefined> = { ...ready };
    delete runtime.INITIAL_ADMIN_EMAIL;
    delete runtime.INITIAL_ADMIN_SETUP_SECRET;
    delete runtime.INITIAL_ALLOWED_CITIES;
    expect(() => assertLaunchConfig(runtime, 'api')).not.toThrow();
    expect(() => assertLaunchConfig(runtime, 'worker')).not.toThrow();
    expect(() => assertLaunchConfig(runtime, 'bootstrap')).toThrow(/INITIAL_ADMIN_EMAIL/);
  });

  it('limits bootstrap to the one-time admin inputs', () => {
    expect(() =>
      assertLaunchConfig(
        {
          NODE_ENV: 'production',
          DATABASE_URL: ready.DATABASE_URL,
          INITIAL_ADMIN_EMAIL: ready.INITIAL_ADMIN_EMAIL,
          INITIAL_ADMIN_SETUP_SECRET: ready.INITIAL_ADMIN_SETUP_SECRET,
          INITIAL_ALLOWED_CITIES: ready.INITIAL_ALLOWED_CITIES,
        },
        'bootstrap',
      ),
    ).not.toThrow();
  });
});
