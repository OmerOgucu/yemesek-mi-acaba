import assert from 'node:assert/strict';
import { execFileSync } from 'child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import test from 'node:test';
import { buildReport, renderState, sanitize } from './report.mjs';
import { isTrustedComment, marker, openFindingIds, planNotifications } from './notify-plan.mjs';
import { assertApi, postFromEvent } from './post-from-event.mjs';
import { readZipEvidence } from './zip-evidence.mjs';
import { validateEvidence } from './evidence.mjs';

const sha = 'a'.repeat(40);
const shaB = 'b'.repeat(40);

function bot(body) {
  return { user: { login: 'github-actions[bot]', type: 'Bot' }, body };
}

function human(body) {
  return { user: { login: 'someone', type: 'User' }, body };
}

function evidence(tests, extra = {}) {
  return { version: 1, sha, runId: '42', runAttempt: '1', tests, ...extra };
}

const queuePass = {
  'apps/api/test/queue-recovery.spec.ts::queue crash recovery kills a worker after it leases a job and the next pass reclaims it': 'pass',
  'apps/api/test/queue-recovery.spec.ts::queue crash recovery ends a fifth-attempt mail crash as FAILED and does not send an expired job': 'pass',
};

test('job success without test evidence is not solved', () => {
  const report = buildReport({
    sha,
    target: 'pull_request',
    pr: '1',
    jobs: { check: 'success', runtime: 'skipped' },
    root: process.cwd(),
    actor: 'cursor[bot]',
    event: 'pull_request',
    runId: '42',
    runAttempt: '1',
    headSha: 'c'.repeat(40),
  });
  assert.match(report.text, /İncelenen SHA/);
  assert.match(report.text, /PR #1/);
  assert.match(report.text, /Koşu: 42 deneme 1/);
  assert.match(report.text, /bağımsız bir inceleme değildir/);
  assert.match(report.text, /- BULGU id=queue-reclaim/);
  assert.equal(/production ready|üretime hazır/i.test(report.text), false);
  const reclaim = report.findings.find((item) => item.id === 'queue-reclaim');
  assert.equal(reclaim.status, 'DOĞRULANMADI');
  assert.equal(reclaim.result, 'NOT_RUN');
  const external = report.findings.find((item) => item.id === 'real-accounts');
  assert.equal(external.result, 'BLOCKED_EXTERNAL');
  const edge = report.findings.find((item) => item.id === 'edge-profile');
  assert.equal(edge.result, 'NOT_RUN');
  assert.equal(report.text.includes('@OmerOgucu'), false);
});

test('matching sha, run and passing tests solve only that finding', () => {
  const report = buildReport({
    sha,
    target: 'pull_request',
    pr: '1',
    jobs: { check: 'success', runtime: 'skipped', audit: 'failure' },
    root: process.cwd(),
    evidence: evidence(queuePass),
    runId: '42',
    runAttempt: '1',
  });
  const reclaim = report.findings.find((item) => item.id === 'queue-reclaim');
  assert.equal(reclaim.status, 'ÇÖZÜLDÜ');
  assert.equal(reclaim.result, 'PASS');
  assert.ok(reclaim.places[0].line > 0);
  const dedupe = report.findings.find((item) => item.id === 'cleanup-dedupe');
  assert.equal(dedupe.result, 'NOT_RUN');
  const audit = report.findings.find((item) => item.id === 'dependency-audit');
  assert.equal(audit.status, 'YENİ');
  assert.match(report.text, /id=dependency-audit durum=YENİ/);
  assert.match(report.text, /bağımlılık denetimi \| FAIL/);
});

test('a failed job without a failed test id is not a new finding', () => {
  const report = buildReport({
    sha,
    target: 'main',
    jobs: { check: 'failure', runtime: 'skipped' },
    root: process.cwd(),
    runId: '7',
    runAttempt: '2',
  });
  const reclaim = report.findings.find((item) => item.id === 'queue-reclaim');
  assert.equal(reclaim.status, 'DOĞRULANMADI');
  assert.equal(reclaim.result, 'NOT_RUN');
});

test('a failed anchor test is new and an unrelated pass is not reopened', () => {
  const report = buildReport({
    sha,
    target: 'pull_request',
    jobs: { check: 'failure' },
    root: process.cwd(),
    evidence: evidence({
      ...queuePass,
      'apps/api/test/queue-recovery.spec.ts::queue crash recovery kills a worker after it leases a job and the next pass reclaims it': 'fail',
      'apps/api/test/queue-recovery.spec.ts::queue crash recovery keeps one active cleanup row when storage keeps failing, then completes': 'pass',
    }),
    runId: '42',
    runAttempt: '1',
  });
  const reclaim = report.findings.find((item) => item.id === 'queue-reclaim');
  assert.equal(reclaim.status, 'YENİ');
  assert.equal(reclaim.result, 'FAIL');
  const dedupe = report.findings.find((item) => item.id === 'cleanup-dedupe');
  assert.equal(dedupe.result, 'NOT_RUN');
  assert.notEqual(dedupe.status, 'YENİ');
});

test('skipped or deleted tests stay unverified', () => {
  const skipped = buildReport({
    sha,
    target: 'pull_request',
    jobs: { check: 'success' },
    root: process.cwd(),
    evidence: evidence({
      'apps/api/test/queue-recovery.spec.ts::queue crash recovery kills a worker after it leases a job and the next pass reclaims it': 'skip',
      'apps/api/test/queue-recovery.spec.ts::queue crash recovery ends a fifth-attempt mail crash as FAILED and does not send an expired job': 'pass',
    }),
    runId: '42',
    runAttempt: '1',
  });
  assert.equal(skipped.findings.find((item) => item.id === 'queue-reclaim').result, 'NOT_RUN');
  const missing = buildReport({
    sha,
    target: 'pull_request',
    jobs: { check: 'success' },
    root: path.join(process.cwd(), 'does-not-exist'),
    evidence: evidence(queuePass),
    runId: '42',
    runAttempt: '1',
  });
  assert.equal(missing.findings.find((item) => item.id === 'queue-reclaim').result, 'NOT_RUN');
});

test('evidence for another sha cannot solve a finding', () => {
  const report = buildReport({
    sha,
    target: 'pull_request',
    jobs: { check: 'success' },
    root: process.cwd(),
    evidence: evidence(queuePass, { sha: shaB }),
    runId: '42',
    runAttempt: '1',
  });
  assert.equal(report.findings.find((item) => item.id === 'queue-reclaim').result, 'NOT_RUN');
  assert.equal(validateEvidence({ version: 1, sha: shaB, runId: '1', runAttempt: '1', tests: {} }, sha), null);
});

test('secrets in generated text are redacted', () => {
  const dirty = sanitize('postgresql://yemesek:supersecret@postgres/yemesek token=abc123');
  assert.equal(dirty.includes('supersecret'), false);
  assert.equal(dirty.includes('abc123'), false);
});

test('open finding then pass notifies once, and a repeat run does not', () => {
  const failed = buildReport({
    sha,
    target: 'pull_request',
    pr: '1',
    jobs: { check: 'success' },
    root: process.cwd(),
    evidence: evidence({
      ...queuePass,
      'apps/api/test/queue-recovery.spec.ts::queue crash recovery kills a worker after it leases a job and the next pass reclaims it': 'fail',
    }),
    runId: '42',
    runAttempt: '1',
  });
  const first = planNotifications({ sha, findings: failed.findings, existingComments: [] });
  const opened = first.find((item) => item.id === 'queue-reclaim');
  assert.equal(opened.status, 'YENİ');
  assert.equal(opened.mention, '@OmerOgucu');
  assert.equal(first.some((item) => item.id === 'real-accounts'), false);
  const state = bot(`${renderState(failed.findings)}\n<!-- ${opened.marker} -->\n${opened.text}`);
  const again = planNotifications({ sha, findings: failed.findings, existingComments: [state] });
  assert.equal(again.find((item) => item.id === 'queue-reclaim').status, 'DEVAM EDİYOR');
  const continued = bot(`<!-- ${marker(sha, 'queue-reclaim', 'DEVAM EDİYOR')} -->`);
  const quiet = planNotifications({ sha, findings: failed.findings, existingComments: [state, continued] });
  assert.equal(quiet.filter((item) => item.id === 'queue-reclaim').length, 0);
  const fixed = buildReport({
    sha,
    target: 'pull_request',
    pr: '1',
    jobs: { check: 'success' },
    root: process.cwd(),
    evidence: evidence(queuePass),
    runId: '42',
    runAttempt: '1',
  });
  const resolved = planNotifications({ sha, findings: fixed.findings, existingComments: [state] });
  assert.equal(resolved.find((item) => item.id === 'queue-reclaim').status, 'ÇÖZÜLDÜ');
  const resolvedNote = bot(`<!-- ${marker(sha, 'queue-reclaim', 'ÇÖZÜLDÜ')} -->`);
  const repeat = planNotifications({ sha, findings: fixed.findings, existingComments: [state, resolvedNote] });
  assert.equal(repeat.filter((item) => item.id === 'queue-reclaim').length, 0);
});

test('a second failure on the same finding continues, and the same run does not spam', () => {
  const failed = buildReport({
    sha,
    target: 'pull_request',
    jobs: { check: 'success' },
    root: process.cwd(),
    evidence: evidence({
      ...queuePass,
      'apps/api/test/queue-recovery.spec.ts::queue crash recovery kills a worker after it leases a job and the next pass reclaims it': 'fail',
    }),
    runId: '9',
    runAttempt: '1',
  });
  const previous = bot(renderState([{ id: 'queue-reclaim', status: 'YENİ', result: 'FAIL', important: true }]));
  const planned = planNotifications({ sha, findings: failed.findings, existingComments: [previous] });
  assert.equal(planned.find((item) => item.id === 'queue-reclaim').status, 'DEVAM EDİYOR');
  const marked = bot(`<!-- ${marker(sha, 'queue-reclaim', 'DEVAM EDİYOR')} -->`);
  const rerun = planNotifications({ sha, findings: failed.findings, existingComments: [previous, marked] });
  assert.equal(rerun.filter((item) => item.id === 'queue-reclaim').length, 0);
});

test('main commit A failure carried to commit B resolves once', () => {
  const older = bot(renderState([{ id: 'queue-reclaim', status: 'YENİ', result: 'FAIL', important: true }]));
  const fixed = buildReport({
    sha: shaB,
    target: 'main',
    jobs: { check: 'success' },
    root: process.cwd(),
    evidence: { ...evidence(queuePass), sha: shaB, runId: '100', runAttempt: '1' },
    runId: '100',
    runAttempt: '1',
  });
  const planned = planNotifications({ sha: shaB, findings: fixed.findings, existingComments: [older] });
  assert.equal(planned.find((item) => item.id === 'queue-reclaim').status, 'ÇÖZÜLDÜ');
  assert.match(planned.find((item) => item.id === 'queue-reclaim').marker, new RegExp(shaB));
});

test('a user comment is neither state nor a dedupe block', () => {
  const body = `BULGU id=queue-reclaim durum=YENİ\n- BULGU id=queue-reclaim durum=YENİ\n<!-- ${marker(sha, 'queue-reclaim', 'YENİ')} -->`;
  assert.deepEqual(openFindingIds([human(body)]), []);
  assert.equal(isTrustedComment(human(body)), false);
  const failed = buildReport({
    sha,
    target: 'pull_request',
    jobs: { check: 'success' },
    root: process.cwd(),
    evidence: evidence({
      ...queuePass,
      'apps/api/test/queue-recovery.spec.ts::queue crash recovery kills a worker after it leases a job and the next pass reclaims it': 'fail',
    }),
    runId: '42',
    runAttempt: '1',
  });
  const planned = planNotifications({ sha, findings: failed.findings, existingComments: [human(body)] });
  assert.equal(planned.find((item) => item.id === 'queue-reclaim').status, 'YENİ');
  const dashed = bot('- BULGU id=queue-reclaim durum=YENİ\n- BULGU id=queue-reclaim durum=ÇÖZÜLDÜ');
  assert.deepEqual(openFindingIds([dashed]), []);
  const opened = bot('- BULGU id=cleanup-dedupe durum=YENİ');
  assert.deepEqual(openFindingIds([opened]), ['cleanup-dedupe']);
});

test('ops audit success does not fail unrelated findings', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const apiPath = new URL(url).pathname;
    calls.push(`${options.method} ${apiPath}`);
    assertApi(options.method, apiPath);
    if (apiPath.endsWith('/jobs')) return json({ jobs: [{ name: 'ops-audit', conclusion: 'success' }] });
    if (options.method === 'GET') return json([]);
    return json({ id: 1 });
  };
  const planned = await postFromEvent({
    event: {
      workflow_run: { id: 5, run_attempt: 1, name: 'ops audit', head_sha: sha, event: 'pull_request', pull_requests: [{ number: 1 }] },
    },
    repository: 'OmerOgucu/yemesek-mi-acaba',
    token: 'test-token',
    fetchImpl,
    root: process.cwd(),
    evidence: null,
  });
  const reclaim = planned.findings.find((item) => item.id === 'queue-reclaim');
  assert.equal(reclaim.result, 'NOT_RUN');
  assert.equal(planned.findings.find((item) => item.id === 'ops-image-audit').result, 'PASS');
  assert.equal(planned.notifications.some((item) => item.id === 'queue-reclaim'), false);
  assert.equal(planned.summary.includes('@OmerOgucu'), false);
});

test('privileged poster uses the triggering attempt and ignores outside comments', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const apiPath = `${new URL(url).pathname}${new URL(url).search}`;
    calls.push(`${options.method} ${apiPath}`);
    assertApi(options.method, new URL(url).pathname + new URL(url).search);
    if (apiPath.includes('/jobs')) {
      return json({
        jobs: [
          { name: 'check', conclusion: 'failure' },
          { name: 'runtime', conclusion: 'skipped' },
        ],
      });
    }
    if (apiPath.includes('/comments')) return json([human('BULGU id=queue-reclaim durum=ÇÖZÜLDÜ')]);
    return json({ id: 3 });
  };
  const planned = await postFromEvent({
    event: {
      workflow_run: { id: 11, run_attempt: 2, name: 'check', head_sha: sha, event: 'pull_request', pull_requests: [{ number: 1 }] },
    },
    repository: 'OmerOgucu/yemesek-mi-acaba',
    token: 'test-token',
    fetchImpl,
    root: process.cwd(),
    evidence: evidence({
      ...queuePass,
      'apps/api/test/queue-recovery.spec.ts::queue crash recovery kills a worker after it leases a job and the next pass reclaims it': 'fail',
    }),
  });
  assert.equal(planned.summary.includes('supersecret'), false);
  assert.equal(planned.summary.includes('@OmerOgucu'), false);
  assert.ok(planned.notifications.some((item) => item.id === 'queue-reclaim' && item.status === 'YENİ'));
  assert.ok(calls.some((call) => call.includes('/attempts/2/jobs')));
  assert.throws(() => assertApi('POST', '/repos/a/b/actions/runners/registration-token'));
  assert.throws(() => assertApi('GET', '/repos/a/b/commits/not-a-sha/check-runs'));
  assert.doesNotThrow(() => assertApi('GET', '/repos/a/b/issues/1/comments?per_page=100&page=2'));
});

test('main parent comments carry an open finding into the next sha', async () => {
  const parent = 'c'.repeat(40);
  const fetchImpl = async (url, options) => {
    const apiPath = new URL(url).pathname;
    assertApi(options.method, `${apiPath}${new URL(url).search}`);
    if (apiPath.endsWith('/jobs')) return json({ jobs: [{ name: 'main-check', conclusion: 'success' }] });
    if (apiPath.endsWith(`/commits/${shaB}`)) return json({ parents: [{ sha: parent }] });
    if (apiPath.endsWith(`/commits/${parent}`)) return json({ parents: [] });
    if (apiPath.endsWith(`/commits/${parent}/comments`)) {
      return json([bot(renderState([{ id: 'queue-reclaim', status: 'YENİ', result: 'FAIL', important: true }]))]);
    }
    if (apiPath.endsWith('/comments') && options.method === 'GET') return json([]);
    return json({ id: 9 });
  };
  const planned = await postFromEvent({
    event: { workflow_run: { id: 20, run_attempt: 1, name: 'main', head_sha: shaB, event: 'push', pull_requests: [] } },
    repository: 'OmerOgucu/yemesek-mi-acaba',
    token: 'test-token',
    fetchImpl,
    root: process.cwd(),
    dryRun: true,
    evidence: { ...evidence(queuePass), sha: shaB },
  });
  assert.equal(planned.notifications.find((item) => item.id === 'queue-reclaim').status, 'ÇÖZÜLDÜ');
});

test('zip evidence rejects unexpected entries and reads a known file', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'yemesek-zip-'));
  try {
    const payload = JSON.stringify({ version: 1, sha, runId: '1', runAttempt: '1', tests: queuePass });
    writeFileSync(path.join(dir, 'evidence.json'), payload);
    execFileSync('zip', ['-q', 'evidence.zip', 'evidence.json'], { cwd: dir });
    const entries = readZipEvidence(readFileSync(path.join(dir, 'evidence.zip')));
    assert.equal(JSON.parse(entries['evidence.json']).sha, sha);
    writeFileSync(path.join(dir, 'note.sh'), 'echo no\n');
    execFileSync('zip', ['-q', 'bad.zip', 'note.sh'], { cwd: dir });
    assert.throws(() => readZipEvidence(readFileSync(path.join(dir, 'bad.zip'))), /arşiv/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

function json(body) {
  return { ok: true, status: 200, json: async () => body, arrayBuffer: async () => new ArrayBuffer(0) };
}
