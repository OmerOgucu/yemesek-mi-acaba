import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { API_KEYS, BACKUP_KEYS, BOOTSTRAP_KEYS, MIGRATE_KEYS, WEB_KEYS, renderRole } from './lib/allowlists.mjs';

const file = process.argv[2];
const outDir = process.argv[3] || 'ops/state/env';
if (!file) {
  process.stderr.write('--env-file gerekli\n');
  process.exit(2);
}

const env = parse(readFileSync(file, 'utf8'));
mkdirSync(outDir, { recursive: true });
const roles = {
  'web.env': WEB_KEYS,
  'api.env': API_KEYS,
  'worker.env': API_KEYS,
  'bootstrap.env': BOOTSTRAP_KEYS,
  'migrate.env': MIGRATE_KEYS,
  'backup.env': BACKUP_KEYS,
};
for (const [name, keys] of Object.entries(roles)) {
  const target = path.join(outDir, name);
  writeFileSync(target, renderRole(env, keys), { mode: 0o600 });
  chmodSync(target, 0o600);
}
process.stdout.write('render-env: allowlist files written\n');

function parse(text) {
  const env = {};
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index < 1) continue;
    const key = line.slice(0, index).trim();
    if (!/^[A-Za-z0-9_]+$/.test(key)) continue;
    env[key] = line.slice(index + 1);
  }
  return env;
}
