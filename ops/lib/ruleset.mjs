export const REQUIRED_CONTEXTS = ['check', 'runtime', 'audit', 'ops-audit'];

export function planRulesetWrite(existing, desired) {
  if (!desired || desired.name !== 'main') throw new Error('ruleset adı main olmalı');
  const rulesets = Array.isArray(existing) ? existing : [];
  const others = rulesets.filter((item) => item && item.name !== desired.name);
  const current = rulesets.find((item) => item && item.name === desired.name);
  return {
    method: current ? 'PUT' : 'POST',
    id: current ? current.id : null,
    preserveIds: others.map((item) => item.id).filter((id) => id != null),
    body: desired,
  };
}

export function verifyRuleset(applied) {
  const rules = Array.isArray(applied?.rules) ? applied.rules : [];
  const checks = rules.find((rule) => rule.type === 'required_status_checks');
  const contexts = new Set((checks?.parameters?.required_status_checks || []).map((item) => item.context));
  for (const name of REQUIRED_CONTEXTS) {
    if (!contexts.has(name)) throw new Error(`eksik kontrol: ${name}`);
  }
  const pull = rules.find((rule) => rule.type === 'pull_request');
  if (!pull) throw new Error('pull_request kuralı yok');
  if (pull.parameters?.required_approving_review_count !== 0) throw new Error('onay sayısı tek geliştiriciyi kilitlememeli');
  if (!rules.some((rule) => rule.type === 'deletion')) throw new Error('silme koruması yok');
  if (!rules.some((rule) => rule.type === 'non_fast_forward')) throw new Error('force-push koruması yok');
  return true;
}

export function preservedRulesetsIntact(beforeIds, after) {
  const ids = new Set((Array.isArray(after) ? after : []).map((item) => item.id));
  return beforeIds.every((id) => ids.has(id));
}
