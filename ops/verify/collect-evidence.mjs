import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

const root = process.cwd();
const tests = {};

function relative(file) {
  const normalized = file.split(path.sep).join('/');
  const prefix = root.endsWith('/') ? root : `${root}/`;
  return normalized.startsWith(prefix) ? normalized.slice(prefix.length) : normalized;
}

function put(key, status) {
  if (!key || (status !== 'pass' && status !== 'fail' && status !== 'skip')) return;
  if (tests[key] === 'fail') return;
  if (status === 'fail' || tests[key] !== 'pass') tests[key] = status;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

const jestStatus = { passed: 'pass', failed: 'fail', pending: 'skip', skipped: 'skip', todo: 'skip', disabled: 'skip' };
const jestReport = readJson('ops/state/api-jest.json');
for (const suite of jestReport?.testResults || []) {
  const file = relative(suite.name || '');
  for (const assertion of suite.assertionResults || []) {
    const title = assertion.fullName || assertion.title || '';
    put(`${file}::${title}`, jestStatus[assertion.status] || 'skip');
  }
}

try {
  const lines = readFileSync('ops/state/node-tests.ndjson', 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    const event = JSON.parse(line);
    put(`${relative(event.file)}::${event.name}`, event.status);
  }
} catch {
  // The node reporter file is absent when those tests did not run.
}

mkdirSync('ops/state', { recursive: true });
const payload = {
  version: 1,
  sha: process.env.GITHUB_SHA || '',
  runId: process.env.GITHUB_RUN_ID || '',
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || '',
  tests,
};
writeFileSync('ops/state/evidence.json', `${JSON.stringify(payload)}\n`, { mode: 0o644 });
process.stdout.write(`evidence tests ${Object.keys(tests).length}\n`);
