import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';

const file = process.argv[2];
if (!file) {
  process.stderr.write('env dosyası gerekli\n');
  process.exit(1);
}

const secretKeys = new Set(['JWT_ACCESS_SECRET', 'INITIAL_ADMIN_SETUP_SECRET', 'POSTGRES_PASSWORD']);
const placeholder = /^(FILL_ME|CHANGE_ME|change-me|changeme)?$/i;

function generated() {
  return randomBytes(48).toString('base64url');
}

const lines = readFileSync(file, 'utf8').split('\n');
const values = new Map();
for (const line of lines) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const key = line.slice(0, line.indexOf('=')).trim();
  values.set(key, line.slice(line.indexOf('=') + 1));
}

const touched = [];
for (const key of secretKeys) {
  const current = values.get(key) ?? '';
  if (current && !placeholder.test(current)) {
    process.stdout.write(`kept ${key}\n`);
    continue;
  }
  values.set(key, generated());
  touched.push(key);
  process.stdout.write(`generated ${key}\n`);
}

const user = values.get('POSTGRES_USER') || 'yemesek';
const db = values.get('POSTGRES_DB') || 'yemesek';
const password = values.get('POSTGRES_PASSWORD') || '';
const databaseUrl = values.get('DATABASE_URL') || '';
if (!databaseUrl || /FILL_ME|CHANGE_ME|change-me/i.test(databaseUrl)) {
  values.set('DATABASE_URL', `postgresql://${user}:${encodeURIComponent(password)}@postgres:5432/${db}`);
  touched.push('DATABASE_URL');
  process.stdout.write('generated DATABASE_URL\n');
}

const output = [];
const seen = new Set();
for (const line of lines) {
  if (!line || line.startsWith('#') || !line.includes('=')) {
    output.push(line);
    continue;
  }
  const key = line.slice(0, line.indexOf('=')).trim();
  seen.add(key);
  output.push(`${key}=${values.get(key) ?? ''}`);
}
for (const [key, value] of values) {
  if (!seen.has(key)) output.push(`${key}=${value}`);
}
writeFileSync(file, output.join('\n').replace(/\n?$/, '\n'));
if (!touched.length) process.stdout.write('init-env: no new secrets\n');
