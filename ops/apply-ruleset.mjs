import { readFileSync } from 'fs';
import { planRulesetWrite, preservedRulesetsIntact, verifyRuleset } from './lib/ruleset.mjs';

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const repo = process.argv[2] || process.env.GITHUB_REPOSITORY || '';
if (!token) {
  process.stderr.write('NOT_APPLIED: GH_TOKEN yok. Dosyanın varlığı uygulama değildir.\n');
  process.exit(2);
}
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
  process.stderr.write('NOT_APPLIED: depo geçersiz\n');
  process.exit(2);
}

const desired = JSON.parse(readFileSync('.github/rulesets/main.json', 'utf8'));
const headers = {
  accept: 'application/vnd.github+json',
  authorization: `Bearer ${token}`,
  'content-type': 'application/json',
  'user-agent': 'yemesek-protect',
  'x-github-api-version': '2022-11-28',
};

async function api(method, apiPath, body) {
  const response = await fetch(`https://api.github.com${apiPath}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`github ${response.status}`);
  return text ? JSON.parse(text) : {};
}

const existing = [];
for (let page = 1; page <= 10; page += 1) {
  const batch = await api('GET', `/repos/${repo}/rulesets?per_page=100&page=${page}`);
  if (!Array.isArray(batch) || batch.length === 0) break;
  existing.push(...batch);
  if (batch.length < 100) break;
}
const plan = planRulesetWrite(existing, desired);
const written = plan.method === 'PUT'
  ? await api('PUT', `/repos/${repo}/rulesets/${plan.id}`, plan.body)
  : await api('POST', `/repos/${repo}/rulesets`, plan.body);
const applied = await api('GET', `/repos/${repo}/rulesets/${written.id}`);
verifyRuleset(applied);
const after = await api('GET', `/repos/${repo}/rulesets?per_page=100`);
if (!preservedRulesetsIntact(plan.preserveIds, after)) {
  throw new Error('diğer ruleset kayboldu');
}
process.stdout.write(`APPLIED ruleset ${applied.name} id=${applied.id}\n`);
