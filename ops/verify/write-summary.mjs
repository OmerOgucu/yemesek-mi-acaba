import { appendFileSync } from 'fs';
import { loadEvidenceFiles } from './evidence.mjs';
import { buildReport } from './report.mjs';

function normalizeJob(value) {
  if (value === 'success') return 'success';
  if (value === 'failure') return 'failure';
  return 'skipped';
}

const sha = process.env.GITHUB_SHA || '';
const evidence = loadEvidenceFiles(
  [
    'ops/state/evidence-check/evidence.json',
    'ops/state/evidence.json',
    'ops/state/evidence-runtime/runtime-evidence.json',
    'ops/state/runtime-evidence.json',
  ],
  sha,
);
const report = buildReport({
  sha,
  target: process.env.VERIFY_TARGET || 'pull_request',
  pr: process.env.PR_NUMBER || '',
  release: process.env.RELEASE_TAG || '',
  jobs: {
    check: normalizeJob(process.env.CHECK_RESULT),
    runtime: normalizeJob(process.env.RUNTIME_RESULT),
    audit: normalizeJob(process.env.AUDIT_RESULT),
    'ops-audit': normalizeJob(process.env.OPS_AUDIT_RESULT),
    edge: normalizeJob(process.env.EDGE_RESULT),
  },
  root: process.cwd(),
  priorUrl: process.env.PRIOR_RUN_URL || '',
  actor: process.env.GITHUB_ACTOR || '',
  event: process.env.GITHUB_EVENT_NAME || '',
  evidence,
  runId: process.env.GITHUB_RUN_ID || '',
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || '',
  headSha: process.env.PR_HEAD_SHA || '',
});
process.stdout.write(`${report.text}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report.text}\n`);
