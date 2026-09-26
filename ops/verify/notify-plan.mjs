import { extractState } from './report.mjs';

export function marker(sha, id, status) {
  return `yemesek-notify ${sha} ${id} ${status}`;
}

export function summaryMarker() {
  return 'yemesek-verify-summary';
}

export function isTrustedComment(comment) {
  return comment?.user?.login === 'github-actions[bot]' && comment?.user?.type === 'Bot';
}

export function openFindingIds(comments) {
  const open = new Set();
  for (const comment of comments) {
    if (!isTrustedComment(comment)) continue;
    const body = String(comment.body || '');
    const state = extractState(body);
    if (state) {
      for (const item of state.findings) {
        if (!item || typeof item.id !== 'string') continue;
        if (item.status === 'YENİ' || item.status === 'DEVAM EDİYOR') open.add(item.id);
        else open.delete(item.id);
      }
      continue;
    }
    for (const match of body.matchAll(/^- BULGU id=([a-z0-9-]+) durum=(YENİ|DEVAM EDİYOR|ÇÖZÜLDÜ)/gm)) {
      if (match[2] === 'ÇÖZÜLDÜ') open.delete(match[1]);
      else open.add(match[1]);
    }
  }
  return [...open];
}

export function planNotifications({ sha, findings, existingComments = [] }) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('SHA geçersiz');
  const trusted = existingComments.filter(isTrustedComment);
  const previous = new Set(openFindingIds(trusted));
  const bodies = trusted.map((comment) => String(comment.body || ''));
  const notifications = [];
  for (const finding of findings) {
    if (!finding.important) continue;
    let status = finding.status;
    if (status === 'YENİ' && previous.has(finding.id)) status = 'DEVAM EDİYOR';
    const failed = status === 'YENİ' || status === 'DEVAM EDİYOR';
    const resolved = status === 'ÇÖZÜLDÜ' && previous.has(finding.id);
    if (!failed && !resolved) continue;
    const mark = marker(sha, finding.id, status);
    if (bodies.some((body) => body.includes(mark))) continue;
    const where = (finding.places || []).map((place) => `${place.file}:${place.line}`).join(', ') || 'satır yok';
    notifications.push({
      id: finding.id,
      status,
      marker: mark,
      mention: '@OmerOgucu',
      text: [
        '@OmerOgucu',
        '',
        failed ? `Yeni veya süren önemli bulgu (${status}).` : `Önceki önemli bulgu kapandı (${status}).`,
        `SHA: \`${sha}\``,
        `Bulgu: ${finding.id} — ${finding.title}`,
        `Yer: ${where}`,
        `Etki: ${finding.impact}`,
        `Gerekli düzeltme: ${finding.fix}`,
        '',
        'Bu yorum production deploy veya otomatik birleştirme yapmaz.',
      ].join('\n'),
    });
  }
  return notifications;
}
