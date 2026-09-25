Bu dosya `ops/verify/write-summary.mjs` çıktısının örneğidir. SHA bir commit değildir. Runtime sütunu NOT_RUN olduğu için o satırlar PASS değildir.

## Doğrulama özeti

İncelenen SHA: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
Hedef: PR #1
Olay: pull_request
Tetikleyen: cursor[bot]

### Kontroller

| Kontrol | Sonuç |
| --- | --- |
| kaynak (typecheck, test, imaj) | PASS |
| runtime (Compose, restart, Playwright, yedek) | NOT_RUN |

### Bulgular

- BULGU id=queue-reclaim durum=ÇÖZÜLDÜ sonuç=PASS
  - Başlık: Worker çökünce posta ve cleanup işi geri alınır
  - Yer: apps/api/test/queue-recovery.spec.ts:63, apps/api/test/queue-recovery.spec.ts:95
  - Etki: Ölü süreç RUNNING veya beşinci denemede SENDING bırakırsa iş takılır ya da sessizce yeniden gönderilir.
  - Gerekli düzeltme: Süreli lease ile geri al. Deneme tavanını FAILED yap. Kanıt: queue-recovery.spec.ts.
- BULGU id=cleanup-dedupe durum=ÇÖZÜLDÜ sonuç=PASS
  - Başlık: Aynı dosya için cleanup kuyruğu çoğalmaz
  - Yer: apps/api/test/queue-recovery.spec.ts:42
  - Etki: Depo kesilince her tick yeni satır açarsa kuyruk büyümesi durmaz.
  - Gerekli düzeltme: Nesne başına tek aktif satır. Başarısız silme yeni satır açmasın.
- BULGU id=web-allowlist durum=ÇÖZÜLDÜ sonuç=PASS
  - Başlık: Web ortam dosyası backend ve yedek sırlarını almaz
  - Yer: ops/lib/allowlists.test.mjs:35
  - Etki: Web kabı JWT, veritabanı, Brevo, R2 veya yedek parolasını görürse sızıntı yüzeyi büyür.
  - Gerekli düzeltme: Allowlist dışı anahtarı web env dosyasına yazma.
- BULGU id=web-container durum=DOĞRULANMADI sonuç=NOT_RUN
  - Başlık: Çalışan web kabında yasak anahtar yoktur
  - Yer: ops/smoke.sh:110
  - Etki: Allowlist testi dosyayı doğrular. Kabın gerçek ortam anahtarları ayrıca inspect edilmeden PASS sayılmaz.
  - Gerekli düzeltme: smoke.sh inspect anahtar adlarına bakmalı ve yasak adda düşmeli. Değer loglanmaz.
- BULGU id=unhealthy-deploy durum=DOĞRULANMADI sonuç=NOT_RUN
  - Başlık: Sağlıksız deploy veya rollback başarı yazmaz
  - Yer: ops/ci/runtime.sh:122, ops/ci/runtime.sh:112
  - Etki: Health veya smoke düşerken release kaydı yazılırsa bozuk sürüm onaylı görünür.
  - Gerekli düzeltme: Kayıttan önce wait ve smoke. Uyumsuz şemada migrate down yok, çıkış sıfırdan farklı.
- BULGU id=profile-target durum=ÇÖZÜLDÜ sonuç=PASS
  - Başlık: Edge ve localhost doğru servise bakar
  - Yer: ops/verify/gaps.test.mjs:26
  - Etki: Yanlış profil başka sürecin portunu veya boş adresi onaylayabilir.
  - Gerekli düzeltme: localhost api-local, edge ağ içindeki api. Proje başlığı olmadan smoke geçmesin.
- BULGU id=restore-guard durum=ÇÖZÜLDÜ sonuç=PASS
  - Başlık: Restore production veritabanına yazmaz
  - Yer: ops/lib/restore-target.test.mjs:8
  - Etki: URL içinde disposable geçmesi veya parola farkı aynı veritabanını güvenli sanarsa --clean production verisini siler.
  - Gerekli düzeltme: Host, port ve veritabanı adı ayrı ayrı. Ad alanında restore veya disposable. Kullanıcı production kullanıcısı olamaz.
- BULGU id=restore-roundtrip durum=DOĞRULANMADI sonuç=NOT_RUN
  - Başlık: Uzak yedek disposable veritabanına döner
  - Yer: ops/ci/runtime.sh:100
  - Etki: Yalnız yerel dosya veya bütünlüğü bakılmamış kopya, uzak geri dönüşün kanıtı değildir.
  - Gerekli düzeltme: Kimlikle indir, sha256, yanlış parola ve bozuk dosyayı reddet. MinIO gerçek R2 PASS değildir.
- BULGU id=clean-host durum=DOĞRULANMADI sonuç=NOT_RUN
  - Başlık: Temiz Linux, Compose ve tarayıcı akışı
  - Yer: ops/ci/runtime.sh:13, ops/e2e/user.spec.ts:8, ops/e2e/admin.spec.ts:14
  - Etki: Hostta gizli pnpm veya psql varsa VPS akışı kanıtsız kalır. Tarayıcı akışı yalnız kaynak sunucuda koşarsa imaj kanıtı olmaz.
  - Gerekli düzeltme: runtime.sh host psql ve aws yokken imaj, Playwright ve yedek turunu koşar.
- BULGU id=real-accounts durum=DOĞRULANMADI sonuç=BLOCKED_EXTERNAL
  - Başlık: Gerçek R2, Brevo teslimi, DNS ve mağaza imzası
  - Yer: anchor yok
  - Etki: Sahte S3 veya posta yakalayıcı gerçek hesap kanıtı değildir.
  - Gerekli düzeltme: Anahtar, DNS onayı ve imza yokken PASS yazma.

BLOCKED_EXTERNAL ve NOT_RUN, PASS sayılmaz.
Bu özet otomatik birleştirme veya production deploy yapmaz.
