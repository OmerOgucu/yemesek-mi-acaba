# Ortam matrisi

Tek dosya: `.env.production.example`. Operatör bunu `.env.production` diye kopyalar. `./ops/init-env.sh` yalnız boş veya `FILL_ME` olan sırları üretir, dosyayı `0600` yapar, değeri ekrana basmaz, ikinci çalışmada mevcut sırrı döndürmez.

`NEXT_PUBLIC_*` web derlemesine, `EXPO_PUBLIC_*` EAS derlemesine girer. Bunlara sır yazılmaz. `API_INTERNAL_URL` ve `DATABASE_URL` istemciye kopyalanmaz.

`ops/render-env.mjs` tek dosyayı servis allowlist’ine böler: `ops/state/env/web.env`, `api.env`, `worker.env`, `bootstrap.env`, `migrate.env`, `backup.env`. Web allowlist’inde JWT, Brevo, R2, veritabanı, yedek ve kurulum sırrı yoktur. Bootstrap yalnız `INITIAL_*` ve `DATABASE_URL` alır. Yedek anahtarları yalnız yedek işindedir. Compose’un secret dosyası host ele geçirilince süreç ortamından okunabilir; bu sınır belgelenir, host izolasyonu iddia edilmez. Log, `docker inspect` değeri ve CI artifaktı sır basmaz; smoke yalnız anahtar adlarına bakar.

| Değişken | Kim doldurur | Sır | İstemci | Zorunlu |
| --- | --- | --- | --- | --- |
| NODE_ENV | hazır `production` | hayır | hayır | evet |
| PORT | hazır `3001` | hayır | hayır | evet |
| TRUST_PROXY_HOPS | operatör, 0–5 | hayır | hayır | evet |
| JWT_ACCESS_SECRET | init-env üretir | evet | hayır | evet |
| POSTGRES_USER | hazır `yemesek` | hayır | hayır | evet |
| POSTGRES_PASSWORD | init-env üretir | evet | hayır | evet |
| POSTGRES_DB | hazır `yemesek` | hayır | hayır | evet |
| DATABASE_URL | init-env, host `postgres` | evet | hayır | evet |
| APP_PUBLIC_URL | operatör, https | hayır | hayır | evet |
| API_URL | operatör, https | hayır | hayır | evet |
| NEXT_PUBLIC_API_URL | operatör, web build-arg | hayır | evet | evet |
| EXPO_PUBLIC_API_URL | operatör, EAS env | hayır | evet | evet |
| API_INTERNAL_URL | smoke için iç adres | hayır | hayır | hayır |
| CORS_ORIGINS | operatör, https origin | hayır | hayır | evet |
| BREVO_API_KEY | operatör | evet | hayır | evet |
| BREVO_SENDER_EMAIL | operatör | hayır | hayır | evet |
| BREVO_SENDER_NAME | hazır | hayır | hayır | hayır |
| STORAGE_DRIVER | hazır `s3` | hayır | hayır | evet |
| S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_ENDPOINT | operatör, private R2 | evet (anahtarlar) | hayır | evet |
| S3_REGION | hazır `auto` | hayır | hayır | hayır |
| PROJECT_CONTROLLER_NAME, PROJECT_CONTACT_EMAIL, PROJECT_CONTACT_ADDRESS | operatör, gerçek kimlik | hayır | kamu ucu | evet |
| INITIAL_ADMIN_EMAIL | operatör | hayır | hayır | evet |
| INITIAL_ADMIN_SETUP_SECRET | init-env üretir | evet | hayır | evet |
| INITIAL_ALLOWED_CITIES | operatör, virgül | hayır | hayır | evet |
| DEPLOY_PROFILE | `edge` veya `localhost` | hayır | hayır | evet |
| EDGE_NETWORK, API_HOST, WEB_HOST | edge profili | hayır | hayır | edge ise |
| TRAEFIK_ENABLE | `false` bırak, mevcut proxy etiketleri | hayır | hayır | hayır |
| API_BIND_PORT, WEB_BIND_PORT | localhost profili, 127.0.0.1 | hayır | hayır | hayır |
| BACKUP_PASSPHRASE | operatör, yedekten ayrı sakla | evet | hayır | yedek için |
| BACKUP_S3_* | operatör, kanıt kovası değil | evet | hayır | yedek için |
| RESTORE_DATABASE_URL | prova; ad alanında `restore` veya `disposable`, ayrı kullanıcı | evet | hayır | prova |
| BREVO_API_URL | boşsa Brevo; CI posta yakalayıcı | hayır | hayır | hayır |
| JOB_TICK_MS, JOB_LEASE_MS, DELETE_TIMEOUT_MS | worker zaman aşımı | hayır | hayır | hayır |
| BACKUP_MAX_AGE_HOURS | yaş kontrolü, varsayılan 26 | hayır | hayır | hayır |
| ALERT_WEBHOOK_URL | yedek hata bildirimi, gövde sabittir | evet | hayır | hayır |
| BACKUP_FILE | prova dosyası | hayır | hayır | prova |
| ANDROID_PACKAGE, ANDROID_SHA256_CERT_FINGERPRINTS | Play imza sertifikası | hayır | kamu dosyası | uygulama linki |
| APPLE_TEAM_ID, IOS_BUNDLE_ID | Apple hesabı | hayır | kamu dosyası | uygulama linki |

Boş parmak izi veya takım kimliği `/.well-known` uçlarını 404 bırakır. Sahte değer yazılmaz.

Production açılışı `assertLaunchConfig` ile durur. Brevo veya R2’nin geçici kesintisi süreci yeniden başlatmaz; ağ denemesi yalnız `./ops/preflight.sh --live` içindedir.
