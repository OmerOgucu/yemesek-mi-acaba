import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { validateEvidence } from './evidence.mjs';
import { buildReport, renderState, sanitize } from './report.mjs';
import { planNotifications, summaryMarker } from './notify-plan.mjs';
import { readZipEvidence } from './zip-evidence.mjs';

const ALLOWED = [
  /^GET \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+\/attempts\/\d+\/jobs$/,
  /^GET \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+\/artifacts$/,
  /^GET \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/artifacts\/\d+\/zip$/,
  /^GET \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/commits\/[a-f0-9]{40}$/,
  /^GET \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/commits\/[a-f0-9]{40}\/comments$/,
  /^POST \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/commits\/[a-f0-9]{40}\/comments$/,
  /^GET \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/\d+\/comments$/,
  /^POST \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/\d+\/comments$/,
  /^PATCH \/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues\/comments\/\d+$/,
];

const WORKFLOWS = ['check', 'main', 'release', 'dependency audit', 'ops audit'];

export function assertApi(method, apiPath) {
  const pathOnly = String(apiPath || '').split('?')[0];
  const line = `${method} ${pathOnly}`;
  if (!ALLOWED.some((rule) => rule.test(line))) throw new Error('izinli olmayan API');
  return line;
}

const AUTO_EVIDENCE = Symbol('auto-evidence');

export async function postFromEvent({ event, repository, token, fetchImpl, root, dryRun = false, evidence = AUTO_EVIDENCE }) {
  const run = event?.workflow_run;
  if (!run) throw new Error('workflow_run yok');
  if (!WORKFLOWS.includes(run.name)) throw new Error('workflow adı tanımsız');
  const sha = run.head_sha;
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('SHA geçersiz');
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '')) throw new Error('depo geçersiz');
  if (!Number.isInteger(run.id) || !Number.isInteger(run.run_attempt)) throw new Error('koşu kimliği yok');
  const pulls = Array.isArray(run.pull_requests) ? run.pull_requests : [];
  const pr = pulls.find((item) => Number.isInteger(item.number));
  const jobPayload = await github(fetchImpl, token, 'GET', `/repos/${repository}/actions/runs/${run.id}/attempts/${run.run_attempt}/jobs`);
  const jobList = Array.isArray(jobPayload?.jobs) ? jobPayload.jobs : [];
  const jobs = {
    check: pickJob(jobList, ['check', 'main-check', 'release-check']),
    runtime: pickJob(jobList, ['runtime', 'main-runtime', 'release-runtime']),
    audit: pickJob(jobList, ['audit']),
    'ops-audit': pickJob(jobList, ['ops-audit']),
    edge: pickJob(jobList, ['edge']),
  };
  const loaded = evidence === AUTO_EVIDENCE ? await loadRunEvidence(fetchImpl, token, repository, run, sha) : evidence;
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
    evidence: loaded,
    runId: String(run.id),
    runAttempt: String(run.run_attempt),
    headSha: sha,
  });
  const existing = pr
    ? await listPages(fetchImpl, token, `/repos/${repository}/issues/${pr.number}/comments`)
    : await commitThread(fetchImpl, token, repository, sha);
  const notifications = planNotifications({ sha, findings: report.findings, existingComments: existing });
  const summary = sanitize(`<!-- ${summaryMarker()} -->\n${renderState(report.findings)}\n${report.text}`);
  const planned = { summary, notifications, sha, findings: report.findings };
  if (dryRun) return planned;
  await writeSummary(fetchImpl, token, repository, pr, sha, existing, summary);
  for (const note of notifications) {
    const body = sanitize(`<!-- ${note.marker} -->\n${note.text}`);
    if (pr) await github(fetchImpl, token, 'POST', `/repos/${repository}/issues/${pr.number}/comments`, { body });
    else await github(fetchImpl, token, 'POST', `/repos/${repository}/commits/${sha}/comments`, { body });
  }
  return planned;
}

async function loadRunEvidence(fetchImpl, token, repository, run, sha) {
  if (!['check', 'main', 'release'].includes(run.name)) return null;
  const listed = await github(fetchImpl, token, 'GET', `/repos/${repository}/actions/runs/${run.id}/artifacts`);
  const artifacts = Array.isArray(listed?.artifacts) ? listed.artifacts : [];
  const tests = {};
  let matched = false;
  for (const artifact of artifacts) {
    if (artifact.name !== 'evidence-check' && artifact.name !== 'evidence-runtime') continue;
    if (artifact.size_in_bytes > 2_000_000 || artifact.expired) continue;
    const response = await githubRaw(fetchImpl, token, 'GET', `/repos/${repository}/actions/artifacts/${artifact.id}/zip`);
    const entries = readZipEvidence(Buffer.from(await response.arrayBuffer()));
    for (const body of Object.values(entries)) {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        throw new Error('kanıt json değil');
      }
      const valid = validateEvidence(parsed, sha);
      if (!valid || valid.runId !== String(run.id) || valid.runAttempt !== String(run.run_attempt)) continue;
      matched = true;
      Object.assign(tests, valid.tests);
    }
  }
  if (!matched) return null;
  return { version: 1, sha, runId: String(run.id), runAttempt: String(run.run_attempt), tests };
}

async function commitThread(fetchImpl, token, repository, sha) {
  const chain = [sha];
  let cursor = sha;
  for (let index = 0; index < 14; index += 1) {
    const commit = await github(fetchImpl, token, 'GET', `/repos/${repository}/commits/${cursor}`);
    const parent = commit?.parents?.[0]?.sha;
    if (!/^[a-f0-9]{40}$/.test(parent || '')) break;
    chain.push(parent);
    cursor = parent;
  }
  const comments = [];
  for (const item of chain.reverse()) {
    const page = await listPages(fetchImpl, token, `/repos/${repository}/commits/${item}/comments`);
    comments.push(...page);
  }
  return comments;
}

async function listPages(fetchImpl, token, apiPath) {
  const all = [];
  for (let page = 1; page <= 20; page += 1) {
    const batch = await github(fetchImpl, token, 'GET', `${apiPath}?per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
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

function pickJob(jobs, names) {
  for (const name of names) {
    const found = jobs.find((item) => item.name === name);
    if (found) return mapConclusion(found.conclusion);
  }
  return 'skipped';
}

function mapConclusion(value) {
  if (value === 'success') return 'success';
  if (value === 'failure' || value === 'timed_out') return 'failure';
  return 'skipped';
}

async function github(fetchImpl, token, method, apiPath, body) {
  const response = await githubRaw(fetchImpl, token, method, apiPath, body);
  return response.json();
}

async function githubRaw(fetchImpl, token, method, apiPath, body) {
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
  return response;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || eventPath.includes('..')) throw new Error('olay dosyası geçersiz');
  const event = JSON.parse(readFileSync(eventPath, 'utf8'));
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
