# Production kapanış

Dal: `cursor/yemesek-mvp-725b`. Bu dosya kodun tamamlandığını, dış hesabın doğrulandığını ve yayının çıktığını birbirine karıştırmaz.

Redis yok. Kota, posta ve silme kuyruğu Postgres tablolarıdır (`RateBucket`, `MailJob`, `CleanupJob`). Cleanup ve posta işi süreli `leaseOwner` ile alınır. Süresi dolan `RUNNING` geri alınır; deneme tavanı `FAILED` olur. Aynı nesne için tek aktif cleanup satırı vardır. Silme idempotenttir: nesne yoksa iş biter, depo hatası yeni satır açmaz. Posta, sağlayıcı kabulünden sonra veritabanı yazılmadan süreç ölürse yeniden gidebilir. Bu at-least-once’tır; exactly-once iddiası yoktur. Beşinci denemede ölen `SENDING` iş `FAILED` olur. Worker kalp atışı `SELECT 1` değildir: boş kuyrukta da tick ilerler, timer durursa `/ready` 503 döner.

Worker aynı API imajında `RUN_WORKER=true` ile çalışır. API kabında worker kapalıdır.

## Kabul matrisi

Yerel sütun bu çalışma ortamıdır. CI sütunu yalnız o commit’in kendi workflow koşusudur. `a46f89b` imaj derlemesi GitHub Actions run `36194772998` / job `108267995293` içinde API ve web imajı SUCCESS’tir. O sonuç aşağıdaki yeni commit’e yazılmaz. O koşuda Compose, restart, rollback ve Playwright yoktu.

| # | Kontrol | Yerel | CI | Kanıt |
| --- | --- | --- | --- | --- |
| 1 | Typecheck, lint, ops birim | PASS | bu commit’in `check` işi | `pnpm typecheck`, `pnpm lint`, `node --test ops/lib/*.test.mjs` 6/6 |
| 2 | API ve kuyruk toparlanması | PASS | bu commit’in `check` işi | `pnpm --filter @yemesek/api test`, `yemesek_test`. İş öldürme, tavan, tek satır, 5. posta denemesi |
| 3 | İmaj derlemesi | NOT_RUN | `a46f89b` için PASS, bu commit için kendi `check` işi | Yerelde `docker` yok. Eski run `36194772998` yalnız `a46f89b` |
| 4 | Compose, restart, rollback, Playwright, yedek turu | NOT_RUN | bu commit’in `runtime` işi | `ops/ci/runtime.sh`. MinIO ve posta yakalayıcı gerçek R2/Brevo değildir |
| 5 | Gerçek R2 / Brevo teslim / DNS / mağaza imzası | BLOCKED_EXTERNAL | BLOCKED_EXTERNAL | Anahtar, DNS onayı ve imza yok. `r2_app_read` ve `brevo_delivery` bu yüzden PASS yazılmaz |
| 6 | Android emülatör / imzalı mağaza | NOT_RUN | emülatör SDK yoksa çıkış 2, imza BLOCKED_EXTERNAL | `ops/android-emulator.sh`. Sürüm tahmini yok |

Dört mevcut `ignoreGhsas` duruyor. Yeni yok sayma eklenmedi.

## Operatörde kalan

- DNS, mevcut proxy onayı ve gerçek TLS. Bu repo 80/443 açmaz ve başka sitenin nginx dosyasını değiştirmez.
- Gerçek `.env.production`: R2, Brevo, proje yürütücüsü, ilk yönetici e-postası, şehirler.
- İlk parola ve TOTP, tarayıcıda `/yonetici-kurulum` ve `/iki-adim`.
- `./ops/preflight.sh --live --mail-to` yalnız yetkili tek alıcı. Brevo kabulü teslim PASS değildir.
- Play App Signing ve Apple team id. Boşken well-known 404.
- İmzalı `eas build`. CI’deki Android JS bundle mağaza imzası değildir.
- `GH_TOKEN` ile `./ops/github-protect.sh`. Uygulanmış sayılmaz.
- Yedek parolasının ayrı saklanması. Uzak kova kanıt nesnelerini kapsamaz.
