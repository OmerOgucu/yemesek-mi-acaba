# Production kapanış

Dal: `cursor/yemesek-mvp-725b`. Bu dosya kodun tamamlandığını, dış hesabın doğrulandığını ve yayının çıktığını birbirine karıştırmaz.

Redis yok. Kota, posta ve silme kuyruğu Postgres tablolarıdır (`RateBucket`, `MailJob`, `CleanupJob`). Worker aynı API imajında `RUN_WORKER=true` ile çalışır. API kabında worker kapalıdır.

## Kabul matrisi

| # | Kontrol | Sonuç | Kanıt |
| --- | --- | --- | --- |
| 1 | Frozen lockfile, typecheck, lint | PASS | `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint` |
| 2 | Birim ve Postgres entegrasyon | PASS | `pnpm --filter @yemesek/api test`: 15 suite, 53 test, sonra kapanış dosyası 7/7. Hedef `yemesek_test` |
| 3 | Boş Postgres migrate + bootstrap | PASS | `yemesek_closure_test` üzerinde iki migration ve `bootstrap invite_ready`. Kullanıcı 0, davet 1, restoran 0 |
| 4 | İkinci bootstrap | PASS | `already_complete`. Jest: parola ve `allowedCities` ikinci çalışmada durur, demo restoran yok |
| 5 | İmaj + compose + restart | NOT_RUN | Bu ortamda `docker` yok. `Dockerfile.api`, `Dockerfile.web`, compose dosyaları yazıldı. Web `next build` standalone üretti |
| 6 | Eksik production env | PASS | `preflight.sh` `FILL_ME` ile çıktı 1, sır basmadan. Dolu sözleşme ile çıktı 0. Ağ denemesi açılışa bağlı değil |
| 7 | Private storage | PASS yerel / BLOCKED_EXTERNAL R2 | Jest fişi public DTO’dan çıkarır, `/uploads` 404, fiş `private, no-store`. `--live` R2: `BLOCKED_EXTERNAL`, çıktı 2. Sahte PASS yok |
| 8 | Fiş ve gizli içerik sızıntısı | PASS | Kapanış testi: public gövdede `receiptUrl` ve `evidence/` yok; başkasının fişi 404 |
| 9 | Kapalı şehir | PASS | Reddedilen şehir satır açmaz. Sonradan kapanan şehirde liste, detay, yeni şikayet, oy, yanıt ve foto 404; oy/yanıt satırı yok |
| 10 | Yönetici MFA | PASS | Davet tek kullanımlık. TOTP sonrası eski jeton 401. Challenge’sız jeton `/admin/ops` 403. Kurtarma kodu mevcut akışta |
| 11 | Posta kuyruğu | PASS yerel / BLOCKED_EXTERNAL Brevo | Süresi geçmiş iş `EXPIRED`, gönderilmez. Gerçek Brevo teslimi yok |
| 12 | Silme ve retention | PASS yerel | Hesap anonimleşir, kanıt `evidencePurgeAfter` ile zamanlanır, kopya “hemen silindi” demez. Silinemeyen nesne `CleanupJob`. R2 kesintisi enjekte edilmedi |
| 13 | Proxy ve kota | PASS | `TRUST_PROXY_HOPS=0` iken sahte `X-Forwarded-For` kova anahtarına girmez. Sayaç Postgres |
| 14 | Playwright | NOT_RUN | Depoda Playwright koşusu yok. Uydurma yeşil yok |
| 15 | Mobil | PASS config / NOT_RUN cihaz | Production profil localhost ve http’yi düşürür; https manifestinde cleartext yok. `expo export`, APK/AAB/IPA ve cihaz testi çalıştırılmadı |
| 16 | DNS, TLS, app link | BLOCKED_EXTERNAL | Alan adı ve mağaza sertifikası yok. Parmak izi boşsa well-known 404 |
| 17 | Yedek ve rollback | PASS prova / NOT_RUN uzak ve imaj | Şifreli dump `yemesek_restore_test` içine açıldı; `bootstrapComplete=true`, davet 1. Uzak kova ve `aws` yok, `backup.sh` çıktı 1. Docker olmadığı için rollback imajı çalışmadı. Migration down yok |
| 18 | Sır taraması | PASS ağaç / NOT_RUN imaj | Ağaçta özel anahtar deseni yok. İmaj katmanı ve CI artifaktı bu ortamda yok |

Dört mevcut `ignoreGhsas` duruyor (Prisma deepmerge, Metro image-size, Expo uuid). Yeni yok sayma eklenmedi. `pnpm audit:deps` çıktı 0.

## Operatörde kalan

- DNS ve mevcut proxy’de host yönlendirmesi. Bu repo 80/443 açmaz.
- Gerçek `.env.production` değerleri: R2, Brevo, proje yürütücüsü, ilk yönetici e-postası, şehirler.
- `./ops/preflight.sh --live` gerçek R2 ile. Brevo teslimi ayrıca, test adresine.
- İlk yönetici parolası ve TOTP, panelden.
- Play App Signing SHA-256 ve Apple team id. Boşken link dosyası yayınlanmaz.
- `eas build` imzası EAS hesabında.
- `GH_TOKEN` ile `./ops/github-protect.sh`. Uygulanmış değil.
- Uzak yedek kovası ve parolanın ayrı saklanması. Parola kaybolursa yedek açılmaz.
