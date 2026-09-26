import { readFileSync, writeFileSync } from 'fs';

const steps = readFileSync('ops/state/runtime-steps.txt', 'utf8')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);
const tests = {};
for (const step of steps) {
  tests[step.includes('::') ? step : `ops/ci/runtime.sh::${step}`] = 'pass';
}
const payload = {
  version: 1,
  sha: process.env.GITHUB_SHA || '',
  runId: process.env.GITHUB_RUN_ID || '',
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || '',
  tests,
};
writeFileSync('ops/state/runtime-evidence.json', `${JSON.stringify(payload)}\n`, { mode: 0o644 });
process.stdout.write(`runtime evidence ${Object.keys(tests).length}\n`);
