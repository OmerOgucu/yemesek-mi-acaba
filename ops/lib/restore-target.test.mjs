import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDisposableTarget } from './restore-target.mjs';
import { nginxParts, nginxTestConfig } from './nginx-snippet.mjs';

const production = 'postgresql://yemesek:secret@db.internal:5432/yemesek';

test('rejects the production database under another spelling', () => {
  assert.throws(() => assertDisposableTarget('postgres://other:secret@db.internal:5432/yemesek', production), /production/);
  assert.throws(() => assertDisposableTarget('postgresql://yemesek:restore@db.internal:5432/yemesek', production), /production|adı/);
  assert.throws(() => assertDisposableTarget('postgresql://restore:secret@db.internal:5432/yemesek', production), /production/);
  assert.throws(() => assertDisposableTarget('postgresql://yemesek:secret@db.internal:5432/yemesek?opt=disposable', production), /parametre|production|adı/);
  assert.throws(() => assertDisposableTarget('not a url', production), /ayrıştırılamadı/);
  assert.throws(() => assertDisposableTarget('postgresql://yemesek:secret@db.internal:5432/yemesek_backup', production), /adı/);
});

test('accepts a different database whose name is disposable', () => {
  const target = assertDisposableTarget('postgresql://restore_only:other@db.internal:5432/yemesek_disposable?sslmode=require', production);
  assert.equal(target.database, 'yemesek_disposable');
  assert.equal(target.user, 'restore_only');
  const rebuilt = new URL(target.connectionUrl);
  assert.equal(rebuilt.pathname, '/yemesek_disposable');
  assert.equal(rebuilt.username, 'restore_only');
  assert.equal(rebuilt.searchParams.get('sslmode'), 'require');
  assert.equal(rebuilt.searchParams.get('dbname'), null);
  assert.throws(() => assertDisposableTarget('postgresql://yemesek:secret@db.internal:5432/yemesek_disposable', production), /kullanıcı/);
});

test('rejects libpq query parameters that change the target', () => {
  const app = 'postgresql://app_user:dummy@db.example.invalid:5432/app';
  const override = 'postgresql://restore_only:dummy@db.example.invalid:5432/app_disposable?dbname=app&user=app_user';
  assert.throws(() => assertDisposableTarget(override, app), /parametre/);
  assert.throws(() => assertDisposableTarget('postgresql://restore_only:dummy@db.example.invalid:5432/app_disposable?DBNAME=app', app), /parametre/);
  assert.throws(() => assertDisposableTarget('postgresql://restore_only:dummy@db.example.invalid:5432/app_disposable?%64bname=app', app), /parametre/);
  assert.throws(() => assertDisposableTarget('postgresql://restore_only:dummy@db.example.invalid:5432/app_disposable?hostaddr=10.0.0.5', app), /parametre/);
  assert.throws(() => assertDisposableTarget('postgresql://restore_only:dummy@db.example.invalid:5432/app_disposable?service=prod', app), /parametre/);
  assert.throws(() => assertDisposableTarget('postgresql://restore_only:dummy@db.example.invalid:5432/app_disposable?sslmode=require&sslmode=disable', app), /parametre/);
  assert.throws(() => assertDisposableTarget('postgresql://restore_only:dummy@h1,h2:5432/app_disposable', app), /host|ayrıştırılamadı/);
  assert.throws(() => assertDisposableTarget('postgresql://restore_only:dummy@db.example.invalid:5432/app_disposable?options=-csearch_path', app), /parametre/);
});

test('nginx snippet does not listen on 80 or 443', () => {
  const parts = nginxParts({ API_BIND_PORT: '3001', WEB_BIND_PORT: '3000', API_HOST: 'api.yemesek.test', WEB_HOST: 'web.yemesek.test' });
  const rendered = `${parts.http}\n${parts.locations}\n${nginxTestConfig(parts)}`;
  assert.equal(/listen\s+80\b/.test(rendered), false);
  assert.equal(/listen\s+443\b/.test(rendered), false);
  assert.match(rendered, /listen 127\.0\.0\.1:18080/);
  assert.match(rendered, /127\.0\.0\.1:3001/);
  assert.match(parts.locations, /\$remote_addr/);
});
