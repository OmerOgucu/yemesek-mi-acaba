import { readFileSync } from 'fs';
import path from 'path';

export const FINDINGS = [
  {
    id: 'queue-reclaim',
    title: 'Worker çökünce posta ve cleanup işi geri alınır',
    proof: 'check',
    important: true,
    anchors: [
      ['apps/api/test/queue-recovery.spec.ts', 'kills a worker after it leases a job'],
      ['apps/api/test/queue-recovery.spec.ts', 'ends a fifth-attempt mail crash as FAILED'],
    ],
    impact: 'Ölü süreç RUNNING veya beşinci denemede SENDING bırakırsa iş takılır ya da sessizce yeniden gönderilir.',
    fix: 'Süreli lease ile geri al. Deneme tavanını FAILED yap. Kanıt: queue-recovery.spec.ts.',
  },
  {
    id: 'cleanup-dedupe',
    title: 'Aynı dosya için cleanup kuyruğu çoğalmaz',
    proof: 'check',
    important: true,
    anchors: [['apps/api/test/queue-recovery.spec.ts', 'keeps one active cleanup row when storage keeps failing']],
    impact: 'Depo kesilince her tick yeni satır açarsa kuyruk büyümesi durmaz.',
    fix: 'Nesne başına tek aktif satır. Başarısız silme yeni satır açmasın.',
  },
  {
    id: 'web-allowlist',
    title: 'Web ortam dosyası backend ve yedek sırlarını almaz',
    proof: 'check',
    important: true,
    anchors: [['ops/lib/allowlists.test.mjs', 'web env drops backend and backup secrets']],
    impact: 'Web kabı JWT, veritabanı, Brevo, R2 veya yedek parolasını görürse sızıntı yüzeyi büyür.',
    fix: 'Allowlist dışı anahtarı web env dosyasına yazma.',
  },
  {
    id: 'web-container',
    title: 'Çalışan web kabında yasak anahtar yoktur',
    proof: 'runtime',
    important: true,
    anchors: [['ops/smoke.sh', 'web kabında yasak anahtar']],
    impact: 'Allowlist testi dosyayı doğrular. Kabın gerçek ortam anahtarları ayrıca inspect edilmeden PASS sayılmaz.',
    fix: 'smoke.sh inspect anahtar adlarına bakmalı ve yasak adda düşmeli. Değer loglanmaz.',
  },
  {
    id: 'unhealthy-deploy',
    title: 'Sağlıksız deploy veya rollback başarı yazmaz',
    proof: 'runtime',
    important: true,
    anchors: [
      ['ops/ci/runtime.sh', 'smoke passed while api was stopped'],
      ['ops/ci/runtime.sh', 'incompatible rollback was accepted'],
    ],
    impact: 'Health veya smoke düşerken release kaydı yazılırsa bozuk sürüm onaylı görünür.',
    fix: 'Kayıttan önce wait ve smoke. Uyumsuz şemada migrate down yok, çıkış sıfırdan farklı.',
  },
  {
    id: 'profile-target',
    title: 'Edge ve localhost doğru servise bakar',
    proof: 'check',
    important: true,
    anchors: [['ops/verify/gaps.test.mjs', 'localhost smoke targets api-local and edge smoke targets api']],
    impact: 'Yanlış profil başka sürecin portunu veya boş adresi onaylayabilir.',
    fix: 'localhost api-local, edge ağ içindeki api. Proje başlığı olmadan smoke geçmesin.',
  },
  {
    id: 'restore-guard',
    title: 'Restore production veritabanına yazmaz',
    proof: 'check',
    important: true,
    anchors: [['ops/lib/restore-target.test.mjs', 'rejects the production database under another spelling']],
    impact: 'URL içinde disposable geçmesi veya parola farkı aynı veritabanını güvenli sanarsa --clean production verisini siler.',
    fix: 'Host, port ve veritabanı adı ayrı ayrı. Ad alanında restore veya disposable. Kullanıcı production kullanıcısı olamaz.',
  },
  {
    id: 'restore-roundtrip',
    title: 'Uzak yedek disposable veritabanına döner',
    proof: 'runtime',
    important: true,
    anchors: [['ops/ci/runtime.sh', 'wrong passphrase was accepted']],
    impact: 'Yalnız yerel dosya veya bütünlüğü bakılmamış kopya, uzak geri dönüşün kanıtı değildir.',
    fix: 'Kimlikle indir, sha256, yanlış parola ve bozuk dosyayı reddet. MinIO gerçek R2 PASS değildir.',
  },
  {
    id: 'clean-host',
    title: 'Temiz Linux, Compose ve tarayıcı akışı',
    proof: 'runtime',
    important: true,
    anchors: [
      ['ops/ci/runtime.sh', 'host psql present'],
      ['ops/e2e/user.spec.ts', 'register, verify, reset, and file a report'],
      ['ops/e2e/admin.spec.ts', 'admin invite, totp, moderation, closed city, and account delete'],
    ],
    impact: 'Hostta gizli pnpm veya psql varsa VPS akışı kanıtsız kalır. Tarayıcı akışı yalnız kaynak sunucuda koşarsa imaj kanıtı olmaz.',
    fix: 'runtime.sh host psql ve aws yokken imaj, Playwright ve yedek turunu koşar.',
  },
  {
    id: 'real-accounts',
    title: 'Gerçek R2, Brevo teslimi, DNS ve mağaza imzası',
    proof: 'external',
    important: false,
    anchors: [],
    impact: 'Sahte S3 veya posta yakalayıcı gerçek hesap kanıtı değildir.',
    fix: 'Anahtar, DNS onayı ve imza yokken PASS yazma.',
  },
];

export function locateAnchor(root, file, text) {
  const full = path.join(root, file);
  let body;
  try {
    body = readFileSync(full, 'utf8');
  } catch {
    return null;
  }
  const lines = body.split('\n');
  const index = lines.findIndex((line) => line.includes(text));
  if (index < 0) return null;
  return { file, line: index + 1 };
}

export function judgeFinding(finding, jobs, places) {
  if (finding.proof === 'external') {
    return { status: 'DOĞRULANMADI', result: 'BLOCKED_EXTERNAL' };
  }
  if (finding.anchors.length && places.some((place) => !place)) {
    return { status: 'YENİ', result: 'FAIL' };
  }
  const job = jobs[finding.proof] || 'skipped';
  if (job === 'success') return { status: 'ÇÖZÜLDÜ', result: 'PASS' };
  if (job === 'failure') return { status: 'YENİ', result: 'FAIL' };
  return { status: 'DOĞRULANMADI', result: 'NOT_RUN' };
}

export function buildReport({ sha, target, pr, release, jobs, root, priorUrl, actor, event }) {
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('SHA geçersiz');
  const evaluated = FINDINGS.map((finding) => {
    const places = finding.anchors.map(([file, text]) => locateAnchor(root, file, text));
    const judged = judgeFinding(finding, jobs, places);
    return { ...finding, ...judged, places: places.filter(Boolean) };
  });
  const lines = [
    '## Doğrulama özeti',
    '',
    `İncelenen SHA: \`${sha}\``,
    `Hedef: ${labelTarget(target, pr, release)}`,
    `Olay: ${event || 'bilinmiyor'}`,
    `Tetikleyen: ${actor || 'bilinmiyor'}`,
    '',
    '### Kontroller',
    '',
    `| Kontrol | Sonuç |`,
    `| --- | --- |`,
    `| kaynak (typecheck, test, imaj) | ${jobLabel(jobs.check)} |`,
    `| runtime (Compose, restart, Playwright, yedek) | ${jobLabel(jobs.runtime)} |`,
  ];
  if (priorUrl) lines.push('', `Aynı SHA için önceki başarılı koşu yeniden çalıştırılmadı: ${priorUrl}`);
  lines.push('', '### Bulgular', '');
  for (const finding of evaluated) {
    const where = finding.places.map((place) => `${place.file}:${place.line}`).join(', ') || 'anchor yok';
    lines.push(`- BULGU id=${finding.id} durum=${finding.status} sonuç=${finding.result}`);
    lines.push(`  - Başlık: ${finding.title}`);
    lines.push(`  - Yer: ${where}`);
    lines.push(`  - Etki: ${finding.impact}`);
    lines.push(`  - Gerekli düzeltme: ${finding.fix}`);
  }
  lines.push(
    '',
    'BLOCKED_EXTERNAL ve NOT_RUN, PASS sayılmaz.',
    'Bu özet otomatik birleştirme veya production deploy yapmaz.',
  );
  return { text: sanitize(lines.join('\n')), findings: evaluated };
}

export function sanitize(text) {
  return text
    .replace(/-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----/g, '[gizli]')
    .replace(/postgres(?:ql)?:\/\/\S+/gi, 'postgresql://[gizli]')
    .replace(/\b((?:api[_-]?key|secret|password|token|passphrase)\s*[:=]\s*)\S+/gi, '$1[gizli]');
}

function jobLabel(result) {
  if (result === 'success') return 'PASS';
  if (result === 'failure') return 'FAIL';
  return 'NOT_RUN';
}

function labelTarget(target, pr, release) {
  if (target === 'release') return `yayın ${release || 'etiket yok'}`;
  if (target === 'main') return 'main dalı';
  if (pr) return `PR #${pr}`;
  return 'pull request';
}
