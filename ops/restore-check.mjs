import { assertDisposableTarget } from './lib/restore-target.mjs';

try {
  assertDisposableTarget(process.env.RESTORE_DATABASE_URL, process.env.DATABASE_URL);
} catch (error) {
  const message = error instanceof Error ? error.message : 'restore hedefi reddedildi';
  process.stderr.write(`${message}\n`);
  process.exit(1);
}
process.stdout.write('restore target ok\n');
