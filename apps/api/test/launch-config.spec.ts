import { assertLaunchConfig } from '@yemesek/config';

const ready = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  DATABASE_URL: 'postgresql://app@db.internal:5432/yemesek',
  CORS_ORIGINS: 'https://yemesekmiacaba.com',
  APP_PUBLIC_URL: 'https://yemesekmiacaba.com',
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
});
