import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { buildReport, sanitize } from './report.mjs';
import { planNotifications, summaryMarker } from './notify-plan.mjs';

const ALLOWED = [
  /^GET \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/commits\/[a-f0-9]{40}\/check-runs$/,
  /^GET \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/commits\/[a-f0-9]{40}\/comments$/,
  /^POST \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/commits\/[a-f0-9]{40}\/comments$/,
  /^GET \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/\d+\/comments$/,
  /^POST \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/\d+\/comments$/,
  /^PATCH \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/comments\/\d+$/,
];

export function assertApi(method, apiPath) {
  const line = `${method} ${apiPath}`;
  if (!ALLOWED.some((rule) => rule.test(line))) throw new Error('izinli olmayan API');
  return line;
}

export async function postFromEvent({ event, repository, token, fetchImpl, root, dryRun = false }) {
  const run = event?.workflow_run;
  if (!run) throw new Error('workflow_run yok');
  if (!['check', 'main', 'release', 'dependency audit'].includes(run.name)) throw new Error('workflow adı tanımsız');
  const sha = run.head_sha;
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('SHA geçersiz');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '')) throw new Error('depo geçersiz');
  const pulls = Array.isArray(run.pull_requests) ? run.pull_requests : [];
  const pr = pulls.find((item) => Number.isInteger(item.number));
  const checks = await github(fetchImpl, token, 'GET', `/repos/${repository}/commits/${sha}/check-runs`);
  const names = new Map((checks.check_runs || []).map((item) => [item.name, item.conclusion]));
  const jobs = {
    check: mapConclusion(names.get('check') || names.get('main-check') || names.get('release-check')),
    runtime: mapConclusion(names.get('runtime') || names.get('main-runtime') || names.get('release-runtime')),
  };
  const target = run.event === 'release' ? 'release' : run.event === 'push' ? 'main' : 'pull_request';
  const report = buildReport({
    sha,
    target,
    pr: pr ? String(pr.number) : '',
    release: '',
    jobs,
    root,
    actor: 'workflow_run',
    event: run.event,
  });
  if (names.get('audit') === 'failure' || names.get('audit') === 'timed_out') {
    report.findings.push({
      id: 'audit',
      title: 'Bağımlılık denetimi',
      status: 'YENİ',
      result: 'FAIL',
      important: true,
      impact: 'Açık prod bağımlılığı birleşirse risk taşınır.',
      fix: 'pnpm audit:deps çıktısını gider. Yeni ignore ekleme.',
      places: [{ file: '.github/workflows/audit.yml', line: 1 }],
    });
  }
  const existing = pr
    ? await github(fetchImpl, token, 'GET', `/repos/${repository}/issues/${pr.number}/comments`)
    : await github(fetchImpl, token, 'GET', `/repos/${repository}/commits/${sha}/comments`);
  const bodies = (Array.isArray(existing) ? existing : []).map((item) => String(item.body || ''));
  const notifications = planNotifications({ sha, findings: report.findings, existingBodies: bodies });
  const summary = `<!-- ${summaryMarker()} -->\n${report.text}`;
  const planned = { summary, notifications, sha };
  if (dryRun) return planned;
  await writeSummary(fetchImpl, token, repository, pr, sha, existing, summary);
  for (const note of notifications) {
    const body = sanitize(`<!-- ${note.marker} -->\n${note.text}`);
    if (pr) await github(fetchImpl, token, 'POST', `/repos/${repository}/issues/${pr.number}/comments`, { body });
    else await github(fetchImpl, token, 'POST', `/repos/${repository}/commits/${sha}/comments`, { body });
  }
  return planned;
}

async function writeSummary(fetchImpl, token, repository, pr, sha, existing, summary) {
  const rows = Array.isArray(existing) ? existing : [];
  const current = rows.find((item) => String(item.body || '').includes(summaryMarker()));
  if (pr && current?.id) {
    await github(fetchImpl, token, 'PATCH', `/repos/${repository}/issues/comments/${current.id}`, { body: summary });
    return;
  }
  if (pr) {
    await github(fetchImpl, token, 'POST', `/repos/${repository}/issues/${pr.number}/comments`, { body: summary });
    return;
  }
  await github(fetchImpl, token, 'POST', `/repos/${repository}/commits/${sha}/comments`, { body: summary });
}

function mapConclusion(value) {
  if (value === 'success') return 'success';
  if (value === 'failure' || value === 'timed_out') return 'failure';
  return 'skipped';
}

async function github(fetchImpl, token, method, apiPath, body) {
  assertApi(method, apiPath);
  const response = await fetchImpl(`https://api.github.com${apiPath}`, {
    method,
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'user-agent': 'yemesek-verify',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`github ${response.status}`);
  return response.json();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const planned = await postFromEvent({
    event,
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.GITHUB_TOKEN,
    fetchImpl: globalThis.fetch,
    root: process.cwd(),
    dryRun: process.env.VERIFY_DRY_RUN === '1',
  });
  process.stdout.write(`${planned.notifications.length} bildirim\n`);
}
