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
| `EMAIL_VERIFICATION_TTL_MINUTES` | Kod ve bağlantı ömrü. 5–1440, varsayılan 30. |
| `NODE_ENV` | `production` iken `/auth/dev/verification` 404 döner. |
| `NEXT_PUBLIC_API_URL` | Web’in gördüğü API kökü. Gizli değildir. |
| `EXPO_PUBLIC_API_URL` | Mobilin gördüğü API kökü. Gizli değildir. |

## Brevo

1. Brevo’da bir gönderen adresi doğrula.
2. SMTP API anahtarını yalnızca sunucu ortamına yaz. İstemciye koyma.
3. `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` doldur.
4. Yönetim panelinden `email_verification`, `welcome` ve `password_reset` şablonlarını kontrol et. Kayıtlı şablon varsa o gider; yoksa kod içindeki varsayılan gider.
5. Parola sıfırlama şablonu durur ama bu sürüm e-posta göndermez.

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
- Yüklemeler: S3 uyumlu nesne deposu, imzalı URL ve sahiplik kontrolü. `uploads/` yalnızca yerel MVP içindir.

CORS’a üretim web kökenini eklemeden tarayıcı API’ye ulaşamaz. Bu turda izinli kökenler localhost ve 127.0.0.1’dir.
