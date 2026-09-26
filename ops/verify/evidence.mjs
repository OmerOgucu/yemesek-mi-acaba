import { readFileSync, statSync } from 'fs';

const MAX_BYTES = 2_000_000;

export function lookupTest(evidence, file, title) {
  const tests = evidence?.tests || {};
  const prefix = `${file}::`;
  let seen = null;
  for (const [key, value] of Object.entries(tests)) {
    if (!key.startsWith(prefix)) continue;
    const name = key.slice(prefix.length);
    if (!name.includes(title) && !title.includes(name)) continue;
    if (value === 'fail') return 'fail';
    if (value === 'pass') seen = 'pass';
    else if (seen !== 'pass') seen = 'skip';
  }
  return seen;
}

export function validateEvidence(data, expectedSha) {
  if (!data || data.version !== 1) return null;
  if (typeof data.sha !== 'string' || !/^[a-f0-9]{40}$/.test(data.sha)) return null;
  if (expectedSha && data.sha !== expectedSha) return null;
  if (!/^\d+$/.test(String(data.runId ?? ''))) return null;
  if (!/^\d+$/.test(String(data.runAttempt ?? ''))) return null;
  if (!data.tests || typeof data.tests !== 'object' || Array.isArray(data.tests)) return null;
  const entries = Object.entries(data.tests);
  if (entries.length > 5000) return null;
  const tests = {};
  for (const [key, value] of entries) {
    if (typeof key !== 'string' || key.length === 0 || key.length > 500 || key.includes('\n')) return null;
    if (value !== 'pass' && value !== 'fail' && value !== 'skip') return null;
    tests[key] = value;
  }
  return {
    version: 1,
    sha: data.sha,
    runId: String(data.runId),
    runAttempt: String(data.runAttempt),
    tests,
  };
}

export function loadEvidenceFiles(paths, expectedSha) {
  const tests = {};
  let runId = '';
  let runAttempt = '';
  let sha = '';
  let any = false;
  for (const file of paths) {
    let raw;
    try {
      if (statSync(file).size > MAX_BYTES) continue;
      raw = JSON.parse(readFileSync(file, 'utf8'));
    } catch {
      continue;
    }
    const valid = validateEvidence(raw, expectedSha);
    if (!valid) continue;
    any = true;
    sha = valid.sha;
    runId = valid.runId;
    runAttempt = valid.runAttempt;
    for (const [key, value] of Object.entries(valid.tests)) {
      if (tests[key] === 'fail') continue;
      if (value === 'fail' || tests[key] !== 'pass') tests[key] = value;
    }
  }
  if (!any) return null;
  return { version: 1, sha, runId, runAttempt, tests };
}
