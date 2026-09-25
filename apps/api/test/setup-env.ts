import path from 'path';

const root = path.join(process.cwd(), '..', '..');
const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://yemesek:yemesek@127.0.0.1:5432/yemesek_test';
const parsed = new URL(databaseUrl);
const name = parsed.pathname.replace(/^\//, '');
if (!name.includes('test')) {
  throw new Error(`Refusing tests against database "${name}". The name must contain "test".`);
}
if (!['localhost', '127.0.0.1', 'postgres'].includes(parsed.hostname)) {
  throw new Error(`Refusing tests against database host "${parsed.hostname}".`);
}

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = databaseUrl;
process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-for-production';
process.env.UPLOADS_DIR = path.join(root, 'uploads-test');
process.env.TRUST_PROXY_HOPS = '0';
