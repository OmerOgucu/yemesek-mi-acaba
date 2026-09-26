import { chmodSync, mkdirSync, writeFileSync } from 'fs';
import { assertDisposableTarget } from './lib/restore-target.mjs';
import { buildDisposableSql } from './lib/disposable-db.mjs';

const target = assertDisposableTarget(process.env.RESTORE_DATABASE_URL, process.env.DATABASE_URL);
const url = new URL(target.connectionUrl);
const plan = buildDisposableSql({
  user: target.user,
  database: target.database,
  password: decodeURIComponent(url.password),
  appUser: process.env.POSTGRES_USER,
  appDatabase: process.env.POSTGRES_DB,
});
mkdirSync('ops/state/restore', { recursive: true });
const write = (name, body) => {
  const file = `ops/state/restore/${name}`;
  writeFileSync(file, body, { mode: 0o600 });
  chmodSync(file, 0o600);
};
write('role.sql', plan.role);
write('grants.sql', plan.grants);
write('target.url', `${target.connectionUrl}\n`);
write('names.env', `RESTORE_USER=${plan.user}\nRESTORE_DB=${plan.database}\n`);
write(
  'probe.env',
  `PGHOST=${url.hostname}\nPGPORT=${url.port || '5432'}\nPGUSER=${plan.user}\nPGPASSWORD=${decodeURIComponent(url.password)}\nPGDATABASE=${plan.appDatabase}\n`,
);
process.stdout.write('disposable plan written\n');
