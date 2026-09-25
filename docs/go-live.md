# Yayın sırası

Kod tarafı bittiğinde operatör yalnızca ortam değişkenlerini doldurur ve dağıtır. Bu depo alan adı, Brevo, Postgres, S3 veya mağaza hesabı satın almaz. Sırlar depoya girmez.

Süreç `NODE_ENV=production` iken açılmaz, şu dördü gerçek olana kadar: `JWT_ACCESS_SECRET` (en az 32 karakter, örnek metin değil), `DATABASE_URL` (Postgres, `file:` değil), `CORS_ORIGINS`, `APP_PUBLIC_URL` (`https://`).

## Sıra

1. Bu dalı `main`e al.
2. Sunucuda `apps/api/.env` doldur. Şablon `apps/api/.env.example`. Web `apps/web/.env` yalnızca `NEXT_PUBLIC_API_URL`. Mobil derlemede `EXPO_PUBLIC_API_URL`.
3. `JWT_ACCESS_SECRET` üret: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`. Örnek `change-me-to-a-long-random-string` production’da reddedilir.
4. Postgres bağlantısını `DATABASE_URL`e yaz. SQLite’ı yayına taşıma.
5. `pnpm db:migrate` (deploy). `pnpm db:seed` çalıştırma. Production’da demo seed hiç çalışmaz; `ALLOW_PRODUCTION_SEED` bu yasağı açmaz. İlk yönetici `pnpm --filter @yemesek/database db:bootstrap` ve `POST /auth/admin/setup` ile kurulur.
6. DNS: `yemesekmiacaba.com` web’e, API’nin hostu `APP_PUBLIC_URL` ve `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` ile aynı ailede. TLS zorunlu.
7. Brevo: anahtar yalnızca API ortamında. SPF, DKIM, DMARC: `docs/email-dns.md`. `BREVO_SENDER_EMAIL` doğrulanmış gönderen olsun.
8. `CORS_ORIGINS=https://yemesekmiacaba.com`. www varsa virgülle ekle. Boş bırakılırsa süreç açılmaz.
9. `STORAGE_DRIVER=s3` ve R2/S3 alanları. Kova listelemesi kapalı. `local` ile süreç açılır ama kanıtlar diske düşer; günlük uyarı yazar.
10. `indexPublicReports` kapalı kalsın. `allowedCities` dolu başlasın. `admin2faRequired` açık olsun.
11. Duman: `GET /health` yalnızca `ok` ve süre. Giriş, kayıt, şikayet, yönetim. Bakım açıkken ziyaretçi “Bakımdayız.” görür. `/durum` ve `/ihlal` yoktur.
12. Mağaza: `apps/mobile` içinde `eas build` (`production` profili). API adresi https olsun. Mağaza anahtarları EAS hesabındadır, bu depoda değil.

Ayrıntı: `docs/deploy.md`. Yüzey: `docs/public-surface.md`.

## Operatörün dolduracağı değişkenler

| Değişken | Nerede | Not |
| --- | --- | --- |
| `DATABASE_URL` | API | Postgres. `file:` production’da yasak. |
| `JWT_ACCESS_SECRET` | API | 32+ rastgele. Örnek metin yasak. |
| `APP_PUBLIC_URL` | API | `https://yemesekmiacaba.com` |
| `CORS_ORIGINS` | API | Aynı köken, virgüllü liste. |
| `BREVO_API_KEY` | API | Boşsa e-posta yalnızca günlüğe düşer. |
| `BREVO_SENDER_EMAIL` | API | Doğrulanmış gönderen. |
| `BREVO_SENDER_NAME` | API | Görünen ad. |
| `STORAGE_DRIVER` | API | `s3` |
| `S3_BUCKET` `S3_REGION` `S3_ENDPOINT` `S3_ACCESS_KEY_ID` `S3_SECRET_ACCESS_KEY` `S3_PUBLIC_BASE_URL` | API | R2 veya S3. |
| `SENTRY_DSN` | API | Boşsa olay gitmez. |
| `NEXT_PUBLIC_API_URL` | Web | API’nin https kökü. Gizli değil. |
| `EXPO_PUBLIC_API_URL` | Mobil derleme | Aynı kök. Gizli değil. |

`CAPTCHA_PROVIDER` `none` kalabilir. `TURNSTILE_SECRET` / `HCAPTCHA_SECRET` ancak sağlayıcı seçilirse. `BULK_API_KEY` ve `EXPO_ACCESS_TOKEN` isteğe bağlı.

## Yumuşak yayın için yeter mi?

Evet, yukarıdaki sıra bittiyse. Kod değişikliği gerekmez. Mağaza incelemesi ve TestFlight bu sıradan sonra. Dal koruması GitHub ayarındadır. DPA imzası bu depodan açılmaz.

`pnpm audit:deps` üretim bağımlılıklarını tarar. Yamalanabilir olanlar kilitlendi. Kalan dört uyarı çerçeve içindedir ve `pnpm.auditConfig.ignoreGhsas` ile dışarıda: Prisma `deepmerge-ts`, Metro `image-size` (iki), Expo `uuid`. Yeni bir uyarı bu listeye eklenmeden denetimi düşürür.
