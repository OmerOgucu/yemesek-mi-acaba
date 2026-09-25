import { appendFileSync } from 'fs';
import { buildReport } from './report.mjs';

const sha = process.env.GITHUB_SHA || '';
const report = buildReport({
  sha,
  target: process.env.VERIFY_TARGET || 'pull_request',
  pr: process.env.PR_NUMBER || '',
  release: process.env.RELEASE_TAG || '',
  jobs: {
    check: process.env.CHECK_RESULT || 'skipped',
    runtime: process.env.RUNTIME_RESULT || 'skipped',
  },
  root: process.cwd(),
  priorUrl: process.env.PRIOR_RUN_URL || '',
  actor: process.env.GITHUB_ACTOR || '',
  event: process.env.GITHUB_EVENT_NAME || '',
});
process.stdout.write(`${report.text}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${report.text}\n`);
