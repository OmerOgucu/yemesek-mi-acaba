import { chmodSync, mkdirSync, writeFileSync } from 'fs';
import { assertDisposableTarget } from './lib/restore-target.mjs';

let target;
try {
  target = assertDisposableTarget(process.env.RESTORE_DATABASE_URL, process.env.DATABASE_URL);
} catch (error) {
  const message = error instanceof Error ? error.message : 'restore hedefi reddedildi';
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
mkdirSync('ops/state/restore', { recursive: true });
writeFileSync('ops/state/restore/target.url', target.connectionUrl, { mode: 0o600 });
chmodSync('ops/state/restore/target.url', 0o600);
process.stdout.write('restore target ok\n');
