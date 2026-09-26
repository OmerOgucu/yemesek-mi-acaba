import assert from 'node:assert/strict';
import test from 'node:test';
import { API_KEYS, BACKUP_KEYS, WEB_KEYS, assertWebIsolated, keysOf, renderRole } from './allowlists.mjs';

const env = {
  NODE_ENV: 'production',
  PORT: '3001',
  HOSTNAME: '0.0.0.0',
  JWT_ACCESS_SECRET: 'sentinel-jwt-value',
  DATABASE_URL: 'postgresql://yemesek:sentinel-db@postgres:5432/yemesek',
  BREVO_API_KEY: 'sentinel-brevo',
  S3_SECRET_ACCESS_KEY: 'sentinel-s3',
  S3_ACCESS_KEY_ID: 'sentinel-s3-id',
  S3_BUCKET: 'bucket',
  S3_ENDPOINT: 'https://example.r2.invalid',
  BACKUP_PASSPHRASE: 'sentinel-backup',
  BACKUP_S3_SECRET_ACCESS_KEY: 'sentinel-backup-key',
  INITIAL_ADMIN_SETUP_SECRET: 'sentinel-admin-setup',
  POSTGRES_PASSWORD: 'sentinel-pg',
  ANDROID_PACKAGE: 'app.yemesek',
  APP_PUBLIC_URL: 'https://yemesek.test',
  API_URL: 'https://api.yemesek.test',
  CORS_ORIGINS: 'https://yemesek.test',
  STORAGE_DRIVER: 's3',
  PROJECT_CONTROLLER_NAME: 'Denetçi',
  PROJECT_CONTACT_EMAIL: 'privacy@yemesek.test',
  PROJECT_CONTACT_ADDRESS: 'Adres',
  TRUST_PROXY_HOPS: '1',
  BREVO_SENDER_EMAIL: 'noreply@yemesek.test',
  BREVO_SENDER_NAME: 'Yemesek',
  INITIAL_ADMIN_EMAIL: 'admin@yemesek.test',
  INITIAL_ALLOWED_CITIES: 'istanbul',
};

test('web env drops backend and backup secrets', () => {
  const web = renderRole(env, WEB_KEYS);
  assertWebIsolated(web);
  assert.equal(web.includes('sentinel-'), false);
  assert.equal(keysOf(web).includes('JWT_ACCESS_SECRET'), false);
  assert.equal(keysOf(web).includes('ANDROID_PACKAGE'), true);
});

test('api env keeps runtime keys and drops backup and admin setup', () => {
  const api = renderRole(env, API_KEYS);
  const keys = keysOf(api);
  assert.equal(keys.includes('JWT_ACCESS_SECRET'), true);
  assert.equal(keys.includes('BACKUP_PASSPHRASE'), false);
  assert.equal(keys.includes('INITIAL_ADMIN_SETUP_SECRET'), false);
  assert.equal(keys.includes('POSTGRES_PASSWORD'), false);
  assert.equal(api.includes('sentinel-jwt-value'), true);
  assert.equal(api.includes('sentinel-backup'), false);
  assert.equal(api.includes('sentinel-admin-setup'), false);
});

test('backup env is the only place for the passphrase', () => {
  const backup = renderRole(env, BACKUP_KEYS);
  assert.equal(keysOf(backup).includes('BACKUP_PASSPHRASE'), true);
  assert.equal(keysOf(backup).includes('JWT_ACCESS_SECRET'), false);
});
