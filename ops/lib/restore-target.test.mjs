import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDisposableTarget } from './restore-target.mjs';
import { nginxParts, nginxTestConfig } from './nginx-snippet.mjs';

const production = 'postgresql://yemesek:secret@db.internal:5432/yemesek';

test('rejects the production database under another spelling', () => {
  assert.throws(() => assertDisposableTarget('postgres://other:secret@db.internal:5432/yemesek', production), /production/);
  assert.throws(() => assertDisposableTarget('postgresql://yemesek:restore@db.internal:5432/yemesek', production), /production|adı/);
  assert.throws(() => assertDisposableTarget('postgresql://restore:secret@db.internal:5432/yemesek', production), /production/);
  assert.throws(() => assertDisposableTarget('postgresql://yemesek:secret@db.internal:5432/yemesek?opt=disposable', production), /production|adı/);
  assert.throws(() => assertDisposableTarget('not a url', production), /ayrıştırılamadı/);
  assert.throws(() => assertDisposableTarget('postgresql://yemesek:secret@db.internal:5432/yemesek_backup', production), /adı/);
});

test('accepts a different database whose name is disposable', () => {
  const target = assertDisposableTarget('postgresql://restore_only:other@db.internal:5432/yemesek_disposable', production);
  assert.equal(target.database, 'yemesek_disposable');
  assert.equal(target.user, 'restore_only');
  assert.throws(() => assertDisposableTarget('postgresql://yemesek:secret@db.internal:5432/yemesek_disposable', production), /kullanıcı/);
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
