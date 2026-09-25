import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import test from 'node:test';

const read = (file) => readFileSync(file, 'utf8');

test('deploy records a release only after wait and smoke', () => {
  const text = read('ops/deploy.sh');
  const wait = text.indexOf('up -d --wait --wait-timeout 180');
  const smoke = text.indexOf('sh ops/smoke.sh --env-file "$file"');
  const record = text.indexOf('ops/state/releases/${tag}');
  assert.ok(wait > 0 && smoke > wait && record > smoke);
  assert.equal(/prisma migrate down|migrate down/.test(text), false);
});

test('rollback refuses a newer schema and does not migrate down', () => {
  const text = read('ops/rollback.sh');
  const refuse = text.indexOf('schema ahead of approved image');
  const wait = text.indexOf('up -d --wait --wait-timeout 180');
  assert.ok(refuse > 0 && wait > refuse);
  assert.match(text, /Migration down çalıştırılmadı/);
  assert.equal(/prisma migrate down/.test(text), false);
  assert.match(text, /sh ops\/smoke\.sh/);
});

test('localhost smoke targets api-local and edge smoke targets api', () => {
  const text = read('ops/smoke.sh');
  assert.match(text, /api_svc="api-local"/);
  assert.match(text, /api_svc="api"/);
  assert.match(text, /web_svc="web-local"/);
  assert.match(text, /X-Yemesek-Project|x-yemesek-project/);
  const compose = read('compose.production.yml');
  assert.match(compose, /ops\/state\/env\/web\.env/);
  assert.equal(compose.includes('.env.production'), false);
  const edge = read('compose.edge.yml');
  assert.match(edge, /traefik.enable/);
  assert.equal(/listen\s+80\b/.test(edge), false);
});

test('workspace mode-600 files are written as the invoking user', () => {
  const helper = read('ops/common.sh');
  assert.match(helper, /docker run --user "\$\(id -u\):\$\(id -g\)"/);
  for (const file of ['ops/preflight.sh', 'ops/backup.sh', 'ops/restore-test.sh']) {
    const text = read(file);
    assert.match(text, /docker_as_invoker[\s\S]*render-env\.mjs/);
    assert.equal(/docker run --rm -v "\$PWD:\/work" -w \/work --entrypoint node yemesek-ops:local ops\/render-env\.mjs/.test(text), false);
  }
  assert.match(read('ops/backup.sh'), /docker_as_invoker[\s\S]*openssl yemesek-ops:local/);
  assert.match(read('ops/restore-test.sh'), /docker_as_invoker[\s\S]*enc -d/);
  const ci = read('compose.ci.yml');
  assert.match(ci, /chrislusf\/seaweedfs:4\.47/);
  assert.equal(/image:\s*minio\/minio/.test(ci), false);
});

test('runtime proof stays on a clean host and distributed images', () => {
  const text = read('ops/ci/runtime.sh');
  assert.match(text, /host psql present/);
  assert.match(text, /host aws present/);
  assert.match(text, /playwright/);
  assert.match(text, /smoke passed while api was stopped/);
  assert.match(text, /incompatible rollback was accepted/);
  assert.match(text, /wrong passphrase was accepted/);
  const notify = read('.github/workflows/notify.yml');
  assert.match(notify, /github.event.repository.default_branch/);
  assert.match(notify, /persist-credentials: false/);
  assert.equal(notify.includes('pull_request:'), false);
  assert.equal(notify.includes('head.sha'), false);
});
