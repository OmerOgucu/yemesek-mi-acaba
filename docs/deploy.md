# Yayın iskelesi

Bu dosya gerçek bir yayını başlatmaz. Alan adı satın alma ve Brevo hesabı bu turda yok. Aşağıdaki liste, sonra bağlanacak yerleri sabitler.

## Ortam

API `apps/api/.env.example` içindeki değişkenleri okur. Gizli değerleri depoya koyma.

| Değişken | Ne işe yarar |
| --- | --- |
| `DATABASE_URL` | Şimdilik SQLite. Yayında Postgres bağlantı dizesi. |
| `JWT_ACCESS_SECRET` | Uzun, rastgele erişim sırrı. |
| `PORT` | API portu. |
| `UPLOADS_DIR` | Yerel dosya kökü. Yayında kullanılmaz; nesne deposu gerekir. |
| `BREVO_API_KEY` | Boşsa e-posta günlük ve yerel doğrulama ucuna düşer. Doluysa Brevo SMTP API kullanılır. |
| `BREVO_SENDER_EMAIL` | Doğrulanmış gönderen adresi. |
| `BREVO_SENDER_NAME` | Gönderen adı. |
| `APP_PUBLIC_URL` | Sihirli bağlantının kökü. Örnek: `https://yemesek.example`. |
| `EMAIL_VERIFICATION_TTL_MINUTES` | Kod, doğrulama ve parola sıfırlama ömrü. 5–1440, varsayılan 30. |
| `CAPTCHA_PROVIDER` | `none`, `turnstile` veya `hcaptcha`. |
| `STORAGE_DRIVER` | `local` veya `s3`. |
| `SENTRY_DSN` | Boşsa Sentry susar. |
| `NODE_ENV` | `production` iken `/auth/dev/verification` 404 döner. |
| `NEXT_PUBLIC_API_URL` | Web’in gördüğü API kökü. Gizli değildir. |
| `EXPO_PUBLIC_API_URL` | Mobilin gördüğü API kökü. Gizli değildir. |

## Brevo

1. Brevo’da bir gönderen adresi doğrula.
2. SMTP API anahtarını yalnızca sunucu ortamına yaz. İstemciye koyma.
3. `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` doldur.
4. Yönetim panelinden `email_verification`, `welcome` ve `password_reset` şablonlarını kontrol et. Kayıtlı şablon varsa o gider; yoksa kod içindeki varsayılan gider.
5. Parola sıfırlama gerçekten gider. Şablon anahtarı `password_reset`. Basın ve kaldırma alındı şablonları `press_inquiry` ve `legal_takedown_ack`.

Anahtar yokken API kodu ve bağlantıyı süreç günlüğüne yazar. `GET /auth/dev/verification?email=` yalnızca `NODE_ENV` production değilken ve anahtar yokken cevap verir.

## Alan adı ve DNS

Yer tutucu ad: `yemesek.example`.

| Kayıt | Hedef |
| --- | --- |
| `yemesek.example` | Web (öneri: Vercel) |
| `api.yemesek.example` | API (öneri: Railway veya Fly.io) |
| MX | E-posta sağlayıcısı, Brevo gönderen doğrulaması istediğinde |

`APP_PUBLIC_URL=https://yemesek.example` ve web’de `NEXT_PUBLIC_API_URL=https://api.yemesek.example`.

## Önerilen parçalar

- Web: Vercel, `apps/web`.
- API: Railway veya Fly.io, `apps/api`.
- Veritabanı: Postgres. Şema bugün SQLite üzerinde. Geçiş ayrı bir migration turudur.
- Yüklemeler: `STORAGE_DRIVER=local` geliştirme içindir. Yayında `s3` ve R2/S3 kovası. Kovayı herkese açık listeleme ile açma. `S3_PUBLIC_BASE_URL` yalnızca okunacak dosya köküdür.
- Hata izleme: `SENTRY_DSN` boşsa hiçbir şey gönderilmez.
- Doğrulama: `CAPTCHA_PROVIDER=turnstile` veya `hcaptcha`. Anahtarlar sunucuda kalır.
- Anlık bildirim: `EXPO_ACCESS_TOKEN` yoksa gönderim günlüğe düşer, telefona gitmez.
- Apple ile giriş yok. E-posta ve parola var. İki adımlı doğrulama yönetici içindir. Yayında `admin2faRequired=true`.

## Satın alınacaklar

Alan adı, Brevo, Postgres, S3 veya R2, Sentry projesi, Turnstile veya hCaptcha, Apple ve Google mağaza hesapları. APNs/FCM anahtarları bildirim teslimi için ayrıca gerekir. Bu depoda gerçek sır yok.

## Maliyet notu

Brevo ücretsiz kotası doğrulama ve sıfırlama postası için yetmeyebilir. Depo, kanıt dosyası büyüdükçe artar. Saklama günü `evidenceRetentionDays`. Temizlik `POST /admin/maintenance/purge-evidence` veya zamanlanmış aynı çağrı. Postgres ayrı faturalanır.

## Kontrol listesi

1. Sırlar yalnızca sunucu ortamında.
2. `NODE_ENV=production`. Dev doğrulama ucu kapalı.
3. `GET /health` ayakta. Yönetici özeti Brevo’yu gösterir.
4. Kayıt, sıfırlama, silme, işletme talebi, moderatörün ayar değiştirememesi elden geçti.
5. Şikayet sayfaları noindex. Ayrıntı `docs/indexing.md`.
6. Staging `docs/staging.md`. Mağaza notu `docs/store-checklist.md`.

CORS’a üretim web kökenini eklemeden tarayıcı API’ye ulaşamaz. Bu turda izinli kökenler localhost ve 127.0.0.1’dir.
