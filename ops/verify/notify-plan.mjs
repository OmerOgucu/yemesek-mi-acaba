export function marker(sha, id, status) {
  return `yemesek-notify ${sha} ${id} ${status}`;
}

export function summaryMarker() {
  return 'yemesek-verify-summary';
}

export function parseOpenFindings(bodies) {
  const open = new Set();
  for (const body of bodies) {
    for (const match of body.matchAll(/^BULGU id=([a-z0-9-]+) durum=(YENİ|DEVAM EDİYOR)/gm)) {
      open.add(match[1]);
    }
    for (const match of body.matchAll(/^BULGU id=([a-z0-9-]+) durum=ÇÖZÜLDÜ/gm)) {
      open.delete(match[1]);
    }
  }
  return [...open];
}

export function planNotifications({ sha, findings, existingBodies }) {
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('SHA geçersiz');
  const previous = new Set(parseOpenFindings(existingBodies));
  const notifications = [];
  for (const finding of findings) {
    if (!finding.important) continue;
    let status = finding.status;
    if (status === 'YENİ' && previous.has(finding.id)) status = 'DEVAM EDİYOR';
    const failed = status === 'YENİ' || status === 'DEVAM EDİYOR';
    const resolved = status === 'ÇÖZÜLDÜ' && previous.has(finding.id);
    if (!failed && !resolved) continue;
    const mark = marker(sha, finding.id, status);
    if (existingBodies.some((body) => body.includes(mark))) continue;
    const where = (finding.places || []).map((place) => `${place.file}:${place.line}`).join(', ') || 'satır yok';
    notifications.push({
      id: finding.id,
      status,
      marker: mark,
      mention: '@OmerOgucu',
      text: [
        `@OmerOgucu`,
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
