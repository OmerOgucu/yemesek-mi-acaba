# Production kapanış

Dal: `cursor/yemesek-mvp-725b`. Bu dosya kodun tamamlandığını, dış hesabın doğrulandığını ve yayının çıktığını birbirine karıştırmaz.

Redis yok. Kota, posta ve silme kuyruğu Postgres tablolarıdır (`RateBucket`, `MailJob`, `CleanupJob`). Cleanup ve posta işi süreli `leaseOwner` ile alınır. Süresi dolan `RUNNING` geri alınır; deneme tavanı `FAILED` olur. Aynı nesne için tek aktif cleanup satırı vardır. Silme idempotenttir: nesne yoksa iş biter, depo hatası yeni satır açmaz. Posta, sağlayıcı kabulünden sonra veritabanı yazılmadan süreç ölürse yeniden gidebilir. Bu at-least-once’tır; exactly-once iddiası yoktur. Beşinci denemede ölen `SENDING` iş `FAILED` olur. Worker kalp atışı `SELECT 1` değildir: boş kuyrukta da tick ilerler, timer durursa `/ready` 503 döner.

Worker aynı API imajında `RUN_WORKER=true` ile çalışır. API kabında worker kapalıdır.

## Kabul matrisi

Yerel sütun bu çalışma ortamıdır. CI sütunu yalnız yazılan koşunun kendi SHA’sıdır. `a46f89b` imaj derlemesi GitHub Actions run `36194772998` / job `108267995293` içinde API ve web imajı SUCCESS’tir. O sonuç sonraki commit’e yazılmaz. O koşuda Compose, restart, rollback ve Playwright yoktu.

PR başı `05a2df05caef7744508c2f50cf0193e8dfb34a17`. `pull_request` checkout’u merge commit `54268a900ca8e7185ae3edc96a46a4f3561f7119` (`05a2df0` + `main` `6452448`). Raporun incelediği SHA budur. Koşu: https://github.com/OmerOgucu/yemesek-mi-acaba/actions/runs/36218164866 Olay `pull_request`, tetikleyen `cursor[bot]`. `check`, `runtime` ve `report` PASS. Audit ayrı koşu `36218164829` PASS. `main`, `release` ve `verify-notify` bu olayda çalışmadı.

| # | Kontrol | Yerel | CI | Kanıt |
| --- | --- | --- | --- | --- |
| 1 | Typecheck, lint, ops birim | PASS | PASS | Koşu `36218164866` job `check`. Yerel: `pnpm typecheck`, `pnpm lint`, `node --test ops/lib/*.test.mjs` |
| 2 | API ve kuyruk toparlanması | PASS | PASS | Aynı `check` işi. `queue-recovery.spec.ts`: iş öldürme, tavan, tek satır, 5. posta denemesi |
| 3 | İmaj derlemesi | NOT_RUN | PASS | `a46f89b` run `36194772998` ayrı durur. `05a2df0` merge’inde imaj, `check` içindeki `ops/ci/verify-source.sh` |
| 4 | Compose, restart, rollback, Playwright, yedek turu | NOT_RUN | PASS | Aynı koşunun `runtime` işi, `05a2df0` merge SHA `54268a9`. SeaweedFS ve posta yakalayıcı gerçek R2/Brevo değildir |
| 5 | Gerçek R2 / Brevo teslim / DNS / mağaza imzası | BLOCKED_EXTERNAL | BLOCKED_EXTERNAL | Anahtar, DNS onayı ve imza yok. `r2_app_read` ve `brevo_delivery` PASS yazılmaz |
| 6 | Android emülatör / imzalı mağaza | NOT_RUN | emülatör SDK yoksa çıkış 2, imza BLOCKED_EXTERNAL | `ops/android-emulator.sh`. Sürüm tahmini yok |
| 7 | Canlı `@OmerOgucu` yorumu | DOĞRULANMADI | DOĞRULANMADI | `verify-notify` yalnız `main` üzerindeki `workflow_run` ile çalışır. Bu PR birleşmeden yorum atılmaz. Karar testi `ops/verify/report.test.mjs`, `check` içinde PASS |

Dört mevcut `ignoreGhsas` duruyor. Yeni yok sayma eklenmedi.

Sürekli doğrulama `docs/VERIFY.md` içindedir. `7eda88e` için bot tetiklemeli check koşusu `36198945118` FAIL oldu (Android export yolu). O koşuda runtime NOT_RUN. Bu sonuç `05a2df0` PASS’ına yazılmaz. `05a2df0` öncesi runtime FAIL koşuları da PASS sayılmaz.

## Operatörde kalan

- DNS, mevcut proxy onayı ve gerçek TLS. Bu repo 80/443 açmaz ve başka sitenin nginx dosyasını değiştirmez.
- Gerçek `.env.production`: R2, Brevo, proje yürütücüsü, ilk yönetici e-postası, şehirler.
- İlk parola ve TOTP, tarayıcıda `/yonetici-kurulum` ve `/iki-adim`.
- `./ops/preflight.sh --live --mail-to` yalnız yetkili tek alıcı. Brevo kabulü teslim PASS değildir.
- Play App Signing ve Apple team id. Boşken well-known 404.
- İmzalı `eas build`. CI’deki Android JS bundle mağaza imzası değildir.
- `GH_TOKEN` ile `./ops/github-protect.sh`. Ruleset dosyası `check`, `runtime`, `audit` ve `ops-audit` ister. Token yokken sonuç `BLOCKED_EXTERNAL` / `NOT_APPLIED`dır. Dosyanın varlığı uygulama değildir.
- Yedek parolasının ayrı saklanması. Uzak kova kanıt nesnelerini kapsamaz.
