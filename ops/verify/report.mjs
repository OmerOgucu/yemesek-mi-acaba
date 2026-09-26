import { readFileSync } from 'fs';
import path from 'path';
import { lookupTest } from './evidence.mjs';

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
      ['ops/ci/runtime.sh', 'unhealthy deploy wrote an approved release'],
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
    id: 'edge-profile',
    title: 'Edge profili disposable koşuda ayrıca doğrulanır',
    proof: 'edge',
    important: false,
    anchors: [],
    impact: 'Localhost profilinin geçmesi, dış reverse proxy hedefini doğrulamaz.',
    fix: 'Edge profili ayrı disposable koşuda çalışmadan PASS yazma.',
  },
  {
    id: 'restore-guard',
    title: 'Restore production veritabanına yazmaz',
    proof: 'check',
    important: true,
    anchors: [
      ['ops/lib/restore-target.test.mjs', 'rejects the production database under another spelling'],
      ['ops/lib/restore-target.test.mjs', 'rejects libpq query parameters that change the target'],
    ],
    impact: 'URL içinde disposable geçmesi, parola farkı veya libpq sorgu parametresi aynı veritabanını güvenli sanarsa --clean production verisini siler.',
    fix: 'Hedefi değiştiren sorgu parametresini reddet. Kanonik URL dışında bağlanma. Ayrı kullanıcı production veritabanına CONNECT almasın.',
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
    id: 'restore-integrity',
    title: 'Bozuk veya eksik restore başarı sayılmaz',
    proof: 'runtime',
    important: true,
    anchors: [
      ['ops/ci/runtime.sh', 'restore failed while User already existed'],
      ['ops/ci/runtime.sh', 'partial restore was accepted'],
      ['ops/ci/runtime.sh', 'restore user reached production'],
    ],
    impact: 'User tablosu önceden varsa pg_restore hatası veya eksik kısıt yine de PASS görünebilir.',
    fix: 'Sıfırdan farklı pg_restore çıkışı başarısızdır. Şema, kısıt ve örnek satır doğrulanır. Restore kullanıcısı production veritabanına bağlanamaz.',
  },
  {
    id: 'release-identity',
    title: 'Farklı release ve yanlış hedef onaylanmaz',
    proof: 'runtime',
    important: true,
    anchors: [
      ['ops/ci/runtime.sh', 'rollback returned the previous image'],
      ['ops/ci/runtime.sh', 'moved tag was accepted as the approved image'],
      ['ops/ci/runtime.sh', 'wrong release was accepted'],
      ['ops/ci/runtime.sh', 'web health was accepted as the api'],
    ],
    impact: 'Aynı proje adıyla eski imaj, taşınmış etiket veya web sürecinin adresi onaylı release sanılabilir.',
    fix: 'Onaylı kayıt imaj kimliğini taşır. Etiket başka imaja taşınınca rollback durur. Beden B iken A beklenirse smoke düşer.',
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
    id: 'dependency-audit',
    title: 'Kök üretim bağımlılık denetimi',
    proof: 'audit',
    important: true,
    anchors: [['.github/workflows/audit.yml', 'pnpm audit --prod']],
    impact: 'Kök ağacındaki açık prod bağımlılığı birleşirse risk taşınır.',
    fix: 'pnpm audit --prod çıktısını gider. Yeni ignore ekleme.',
  },
  {
    id: 'ops-image-audit',
    title: 'Ops imajı üretim npm denetimi',
    proof: 'ops-audit',
    important: true,
    anchors: [['.github/workflows/ops-audit.yml', 'npm audit --omit=dev --audit-level=moderate']],
    impact: 'Ops imajının kendi kilidi kök pnpm audit sonucunun dışındadır. Orta veya kritik bulgu imaj derlemesinde yeşil kalabilir.',
    fix: 'Uyumlu yama ile ops/image kilidini güncelle. Orta ve üzeri bulgu ops-audit işini düşürür.',
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

export function judgeFinding(finding, jobs, places, evidence, sha) {
  if (finding.proof === 'external') return { status: 'DOĞRULANMADI', result: 'BLOCKED_EXTERNAL' };
  if (finding.proof === 'edge') {
    if (jobs.edge === 'success' && evidence?.sha === sha && evidence.runId && evidence.runAttempt) {
      return { status: 'ÇÖZÜLDÜ', result: 'PASS' };
    }
    return { status: 'DOĞRULANMADI', result: 'NOT_RUN' };
  }
  if (finding.proof === 'audit' || finding.proof === 'ops-audit') {
    const job = jobs[finding.proof] || 'skipped';
    if (job === 'success') return { status: 'ÇÖZÜLDÜ', result: 'PASS' };
    if (job === 'failure') return { status: 'YENİ', result: 'FAIL' };
    return { status: 'DOĞRULANMADI', result: 'NOT_RUN' };
  }
  if (finding.anchors.length && places.some((place) => !place)) {
    return { status: 'DOĞRULANMADI', result: 'NOT_RUN' };
  }
  const job = jobs[finding.proof] || 'skipped';
  if (job !== 'success' && job !== 'failure') return { status: 'DOĞRULANMADI', result: 'NOT_RUN' };
  if (!evidence || evidence.sha !== sha || !evidence.runId || !evidence.runAttempt) {
    return { status: 'DOĞRULANMADI', result: 'NOT_RUN' };
  }
  const results = finding.anchors.map(([file, title]) => lookupTest(evidence, file, title));
  if (results.some((item) => item === 'fail')) return { status: 'YENİ', result: 'FAIL' };
  if (results.some((item) => item !== 'pass')) return { status: 'DOĞRULANMADI', result: 'NOT_RUN' };
  if (job !== 'success') return { status: 'DOĞRULANMADI', result: 'NOT_RUN' };
  return { status: 'ÇÖZÜLDÜ', result: 'PASS' };
}

export function renderState(findings) {
  const payload = {
    version: 1,
    findings: findings.map((finding) => ({
      id: finding.id,
      status: finding.status,
      result: finding.result,
      important: Boolean(finding.important),
    })),
  };
  return `<!-- yemesek-state v1\n${JSON.stringify(payload)}\n-->`;
}

export function extractState(body) {
  const match = String(body || '').match(/<!-- yemesek-state v1\n([\s\S]*?)\n-->/);
  if (!match) return null;
  try {
    const data = JSON.parse(match[1]);
    if (data.version !== 1 || !Array.isArray(data.findings)) return null;
    return data;
  } catch {
    return null;
  }
}

export function buildReport({ sha, target, pr, release, jobs, root, priorUrl, actor, event, evidence, runId, runAttempt, headSha }) {
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('SHA geçersiz');
  const evaluated = FINDINGS.map((finding) => {
    const places = finding.anchors.map(([file, text]) => locateAnchor(root, file, text));
    const judged = judgeFinding(finding, jobs || {}, places, evidence, sha);
    const tests = finding.anchors.map(([file, title]) => {
      const result = evidence ? lookupTest(evidence, file, title) || 'absent' : 'absent';
      return `${file}::${title}=${result}`;
    });
    return { ...finding, ...judged, places: places.filter(Boolean), tests };
  });
  const lines = [
    '## Doğrulama özeti',
    '',
    `İncelenen SHA: \`${sha}\``,
    `Hedef: ${labelTarget(target, pr, release)}`,
    `Olay: ${event || 'bilinmiyor'}`,
    `Tetikleyen: ${actor || 'bilinmiyor'}`,
    `Koşu: ${runId || 'yok'} deneme ${runAttempt || 'yok'}`,
  ];
  if (headSha && /^[a-f0-9]{40}$/.test(headSha) && headSha !== sha) lines.push(`PR başı: \`${headSha}\``);
  lines.push(
    '',
    '### Kontroller',
    '',
    '| Kontrol | Sonuç |',
    '| --- | --- |',
    `| kaynak (typecheck, test, imaj) | ${jobLabel(jobs?.check)} |`,
    `| runtime (Compose, restart, Playwright, yedek) | ${jobLabel(jobs?.runtime)} |`,
    `| bağımlılık denetimi | ${jobLabel(jobs?.audit)} |`,
    `| ops imaj denetimi | ${jobLabel(jobs?.['ops-audit'])} |`,
    `| edge profili | ${jobLabel(jobs?.edge)} |`,
  );
  if (priorUrl) lines.push('', `Aynı SHA için önceki başarılı koşu yeniden çalıştırılmadı: ${priorUrl}`);
  lines.push('', '### Bulgular', '');
  for (const finding of evaluated) {
    const where = finding.places.map((place) => `${place.file}:${place.line}`).join(', ') || 'anchor yok';
    lines.push(`- BULGU id=${finding.id} durum=${finding.status} sonuç=${finding.result}`);
    lines.push(`  - Başlık: ${finding.title}`);
    lines.push(`  - Yer: ${where}`);
    if (finding.tests.length) lines.push(`  - Test: ${finding.tests.join('; ')}`);
    lines.push(`  - Koşu: ${runId || 'yok'} deneme ${runAttempt || 'yok'} sha ${sha}`);
    lines.push(`  - Etki: ${finding.impact}`);
    lines.push(`  - Gerekli düzeltme: ${finding.fix}`);
  }
  lines.push(
    '',
    'BLOCKED_EXTERNAL ve NOT_RUN, PASS sayılmaz.',
    'Bu özet tanımlı kontrollerin sonucudur. Yeni kodun tamamı için bağımsız bir inceleme değildir.',
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
