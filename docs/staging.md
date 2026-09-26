# Staging

Staging, production’ın küçük kopyasıdır. Aynı kod, ayrı sırlar, ayrı veritabanı, ayrı depo kovası.

## Ortam

`apps/api/.env.example` içindeki anahtarların staging değerleri:

| Değişken | Staging |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Staging Postgres. SQLite’ı staging’e taşıma. |
| `JWT_ACCESS_SECRET` | Prod’dan farklı, uzun, rastgele. |
| `APP_PUBLIC_URL` | `https://staging.yemesekmiacaba.com` |
| `BREVO_API_KEY` | Staging gönderen. Yoksa e-posta gitmez; production’da dev doğrulama ucu da kapalıdır. |
| `CAPTCHA_PROVIDER` | `turnstile` veya `hcaptcha`. `none` yalnızca yerel ve test. |
| `STORAGE_DRIVER` | `s3` ve staging kovası. |
| `SENTRY_DSN` | Staging projesi. Boşsa olay gitmez. |
| `admin2faRequired` | Panelden `true`. Yerelde `false` kalabilir. |

Web: `NEXT_PUBLIC_API_URL=https://api-staging.yemesekmiacaba.com`

Mobil: `EXPO_PUBLIC_API_URL` aynı API. Mağaza derlemesi staging’e bakmasın.

## Kontrol

1. `GET /health` `ok` döner.
2. Yönetici özeti Brevo’nun dolu olup olmadığını gösterir.
3. Kayıt, doğrulama, parola sıfırlama ve hesap silme staging verisinde bir kez elden geçer.
4. Şikayet sayfası `noindex` kalır. Ayar `indexPublicReports` staging’de `false` durur.
