import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import test from 'node:test';
import { planRulesetWrite, preservedRulesetsIntact, verifyRuleset } from './ruleset.mjs';
import { buildDisposableSql } from './disposable-db.mjs';

test('ruleset update keeps other rules and requires runtime', () => {
  const desired = JSON.parse(readFileSync('.github/rulesets/main.json', 'utf8'));
  const plan = planRulesetWrite([{ id: 7, name: 'other' }, { id: 8, name: 'main' }], desired);
  assert.equal(plan.method, 'PUT');
  assert.equal(plan.id, 8);
  assert.deepEqual(plan.preserveIds, [7]);
  const created = planRulesetWrite([{ id: 7, name: 'other' }], desired);
  assert.equal(created.method, 'POST');
  assert.equal(created.id, null);
  assert.equal(verifyRuleset(desired), true);
  const weakened = structuredClone(desired);
  weakened.rules = weakened.rules.map((rule) => {
    if (rule.type !== 'required_status_checks') return rule;
    return {
      ...rule,
      parameters: { ...rule.parameters, required_status_checks: [{ context: 'check' }, { context: 'audit' }] },
    };
  });
  assert.throws(() => verifyRuleset(weakened), /runtime/);
  assert.equal(preservedRulesetsIntact([7], [{ id: 7, name: 'other' }, { id: 9, name: 'main' }]), true);
  assert.equal(preservedRulesetsIntact([7], [{ id: 9, name: 'main' }]), false);
});

test('protect script is not applied without a token', () => {
  const env = { ...process.env };
  delete env.GH_TOKEN;
  delete env.GITHUB_TOKEN;
  const result = spawnSync('sh', ['ops/github-protect.sh'], { env, encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(`${result.stdout}${result.stderr}`, /NOT_APPLIED/);
  assert.equal(`${result.stdout}${result.stderr}`.includes('APPLIED ruleset'), false);
});

test('disposable grants do not let the restore role connect to production', () => {
  const plan = buildDisposableSql({
    user: 'restore_only',
    database: 'yemesek_disposable',
    password: 'ci-restore-password',
    appUser: 'yemesek',
    appDatabase: 'yemesek',
  });
  assert.match(plan.grants, /REVOKE CONNECT ON DATABASE yemesek FROM restore_only/);
  assert.match(plan.grants, /REVOKE CONNECT ON DATABASE yemesek FROM PUBLIC/);
  assert.match(plan.grants, /GRANT CONNECT ON DATABASE yemesek TO yemesek/);
  assert.equal(plan.grants.includes('GRANT CONNECT ON DATABASE yemesek TO restore_only'), false);
  assert.match(plan.role, /NOSUPERUSER/);
  assert.throws(() => buildDisposableSql({
    user: 'yemesek',
    database: 'yemesek_disposable',
    password: 'ci-restore-password',
    appUser: 'yemesek',
    appDatabase: 'yemesek',
  }), /ayrı/);
});
