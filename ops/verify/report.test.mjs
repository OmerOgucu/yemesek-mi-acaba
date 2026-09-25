import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReport, sanitize } from './report.mjs';
import { marker, parseOpenFindings, planNotifications } from './notify-plan.mjs';
import { assertApi, postFromEvent } from './post-from-event.mjs';

const sha = 'a'.repeat(40);

test('skipped and external results are not pass or production ready', () => {
  const report = buildReport({
    sha,
    target: 'pull_request',
    pr: '1',
    jobs: { check: 'success', runtime: 'skipped' },
    root: process.cwd(),
    actor: 'cursor[bot]',
    event: 'pull_request',
  });
  assert.match(report.text, /İncelenen SHA/);
  assert.match(report.text, /PR #1/);
  assert.match(report.text, /cursor\[bot\]/);
  assert.equal(/production ready|üretime hazır/i.test(report.text), false);
  const runtime = report.findings.find((item) => item.id === 'clean-host');
  assert.equal(runtime.status, 'DOĞRULANMADI');
  assert.equal(runtime.result, 'NOT_RUN');
  const external = report.findings.find((item) => item.id === 'real-accounts');
  assert.equal(external.result, 'BLOCKED_EXTERNAL');
  const reclaim = report.findings.find((item) => item.id === 'queue-reclaim');
  assert.equal(reclaim.status, 'ÇÖZÜLDÜ');
  assert.ok(reclaim.places[0].line > 0);
});

test('a failed check is a new finding, not solved', () => {
  const report = buildReport({
    sha,
    target: 'main',
    jobs: { check: 'failure', runtime: 'skipped' },
    root: process.cwd(),
  });
  const reclaim = report.findings.find((item) => item.id === 'queue-reclaim');
  assert.equal(reclaim.status, 'YENİ');
  assert.equal(reclaim.result, 'FAIL');
});

test('secrets in generated text are redacted', () => {
  const dirty = sanitize('postgresql://yemesek:supersecret@postgres/yemesek token=abc123');
  assert.equal(dirty.includes('supersecret'), false);
  assert.equal(dirty.includes('abc123'), false);
});

test('same sha and finding is not notified twice, resolution is', () => {
  const report = buildReport({
    sha,
    target: 'pull_request',
    pr: '1',
    jobs: { check: 'failure', runtime: 'failure' },
    root: process.cwd(),
  });
  const first = planNotifications({ sha, findings: report.findings, existingBodies: [] });
  assert.ok(first.some((item) => item.id === 'queue-reclaim' && item.mention === '@OmerOgucu'));
  assert.equal(first.some((item) => item.id === 'real-accounts'), false);
  const bodies = first.map((item) => `<!-- ${item.marker} -->\n${item.text}`);
  const again = planNotifications({ sha, findings: report.findings, existingBodies: bodies });
  assert.equal(again.length, 0);
  const fixed = buildReport({
    sha,
    target: 'pull_request',
    pr: '1',
    jobs: { check: 'success', runtime: 'success' },
    root: process.cwd(),
  });
  const resolved = planNotifications({
    sha,
    findings: fixed.findings,
    existingBodies: [`BULGU id=queue-reclaim durum=YENİ\n<!-- ${marker(sha, 'queue-reclaim', 'YENİ')} -->`],
  });
  assert.ok(resolved.some((item) => item.id === 'queue-reclaim' && item.status === 'ÇÖZÜLDÜ'));
});

test('open finding on an older note becomes DEVAM EDİYOR', () => {
  const report = buildReport({
    sha,
    target: 'pull_request',
    pr: '1',
    jobs: { check: 'failure', runtime: 'skipped' },
    root: process.cwd(),
  });
  const planned = planNotifications({
    sha,
    findings: report.findings,
    existingBodies: ['BULGU id=queue-reclaim durum=YENİ'],
  });
  assert.equal(planned.find((item) => item.id === 'queue-reclaim').status, 'DEVAM EDİYOR');
  assert.deepEqual(parseOpenFindings(['BULGU id=queue-reclaim durum=YENİ', 'BULGU id=queue-reclaim durum=ÇÖZÜLDÜ']), []);
});

test('privileged poster uses only allowlisted read and comment routes', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const apiPath = new URL(url).pathname;
    calls.push(`${options.method} ${apiPath}`);
    assertApi(options.method, apiPath);
    if (options.method === 'GET' && apiPath.endsWith('/check-runs')) {
      return json({
        check_runs: [
          { name: 'check', conclusion: 'failure', output: { text: 'postgresql://user:supersecret@h/db' } },
          { name: 'runtime', conclusion: 'skipped' },
        ],
      });
    }
    if (options.method === 'GET') return json([]);
    return json({ id: 1 });
  };
  const planned = await postFromEvent({
    event: {
      workflow_run: {
        name: 'check',
        head_sha: sha,
        event: 'pull_request',
        pull_requests: [{ number: 1 }],
      },
    },
    repository: 'OmerOgucu/yemesek-mi-acaba',
    token: 'test-token',
    fetchImpl,
    root: process.cwd(),
  });
  assert.equal(planned.summary.includes('supersecret'), false);
  assert.equal(planned.summary.includes('@OmerOgucu'), false);
  assert.ok(planned.notifications.some((item) => item.text.includes('@OmerOgucu')));
  assert.ok(calls.some((call) => call.startsWith('POST ')));
  assert.throws(() => assertApi('POST', '/repos/a/b/actions/runners/registration-token'));
  assert.throws(() => assertApi('GET', '/repos/a/b/commits/not-a-sha/check-runs'));
});

function json(body) {
  return { ok: true, status: 200, json: async () => body };
}
