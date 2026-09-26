# VPS hızlı başlangıç

Bu paket mevcut 80/443 sahibine dokunmaz. İkinci reverse proxy veya sertifika yöneticisi açmaz. Postgres portu hosta yayınlanmaz.

## Edge (mevcut Dokploy/Traefik ağı)

`DEPLOY_PROFILE=edge`. `EDGE_NETWORK` var olan ağın adıdır. `API_HOST` ve `WEB_HOST` o ağdaki yönlendiricinin kullanacağı hostlardır. `TRAEFIK_ENABLE=true` iken `compose.edge.yml` router etiketlerini basar (`TRAEFIK_ENTRYPOINTS`, `TRAEFIK_CERTRESOLVER`). Traefik’i bu compose başlatmaz ve 80/443 açmaz. Dokploy aynı dış ağa ve bu etiketlere bağlanır.

## Localhost (mevcut Nginx)

`DEPLOY_PROFILE=localhost`. API `127.0.0.1:3001`, web `127.0.0.1:3000`. `./ops/render-nginx.sh --env-file .env.production` snippet’i `ops/state/nginx` altına yazar ve `nginx -t` ile doğrular. Hostun `/etc/nginx` dosyasına yazmaz, 80/443 dinlemez. Mevcut siteye eklemeyi operatör yapar.

## Komutlar

```sh
cp .env.production.example .env.production
./ops/init-env.sh --env-file .env.production
# gerçek hesap, DNS, R2, Brevo, proje kimliği, şehir listesi
./ops/preflight.sh --env-file .env.production
./ops/deploy.sh --env-file .env.production
./ops/smoke.sh --env-file .env.production
./ops/backup.sh --env-file .env.production
./ops/prepare-disposable-db.sh --env-file .env.production
./ops/restore-test.sh --env-file .env.production
./ops/rollback.sh --env-file .env.production --to <ONAYLI_RELEASE>
```

Hostta zorunlu araçlar: Docker, Docker Compose, `sh`, `git`, `flock`, `curl`. Uygulama `node_modules`, host `pnpm`, `aws` ve `psql` gerekmez; bunlar `yemesek-ops` imajındadır. `deploy.sh` kilit alır, imajı bu commit ile etiketler, migration ve bootstrap bitmeden uygulamayı açmaz, `up --wait` ve smoke geçmeden release kaydı yazmaz. Hata kodu sıfırdan farklıdır ve `ops/state/last-failure.txt` yalnız servis durumunu yazar. `compose down -v` yoktur.

`render-env` web kabına JWT, veritabanı, Brevo, R2, yedek ve kurulum sırrını koymaz. API ve worker yedek parolası ile ilk kurulum sırrını almaz. Compose secret dosyası tek host ele geçirilirse süreç ortamından okunur; bu, host kompromisini çözmez.

İlk yönetici daveti `INITIAL_ADMIN_SETUP_SECRET` özetiyle saklanır. Tarayıcı yolu `/yonetici-kurulum`. Sır adres çubuğuna yazılmaz. Sonra giriş ve `/iki-adim`. Eski oturum düşer. Yönetim, aynı oturumda TOTP doğrulanmadan açılmaz.

`backup.sh` şifreli dump’ı uzak kovaya koyar ve yerel şifreli kopyayı tutar. Uzak kopya başarısızsa yerel dosyayı silmez. Anahtar dump’ın içinde değildir. `./ops/install-backup-timer.sh --env-file .env.production` birimleri `ops/state` altına yazar; `/etc` yalnız root `--install` ile değişir. `prepare-disposable-db.sh` disposable veritabanını ve `restore_only` rolünü oluşturur; bu rolün production veritabanına `CONNECT` yetkisi yoktur. `restore-test.sh --backup-id` uzak kimlikten indirir, sha256 bakar, kanonik URL dışında bağlanmaz ve libpq’nun hedef değiştiren sorgu parametrelerini reddeder. `pg_restore` sıfırdan farklı çıkarsa, `User` tablosu duruyor olsa bile prova başarısızdır. Geri yükleme R2 nesnelerini geri getirmez. `rollback.sh` kayıtlı imaj kimliği ve şemayla eşleşmeyen etikete dönmez, migration down çalıştırmaz.

GitHub koruması uygulanmış sayılmaz. Dosya `.github/rulesets/main.json` `check`, `runtime`, `audit` ve `ops-audit` ister; pull request zorunludur, ikinci onaycı gerekmez. Uygulamak için `GH_TOKEN` ile `./ops/github-protect.sh`. Token yoksa çıkış `NOT_APPLIED` ve kod 2’dir. Dosyanın varlığı uygulama değildir. Uygulama sırlarına bu token yazılmaz.

Mobil imza bu depoda yoktur. Production EAS profili `EXPO_PUBLIC_API_URL` https değilse durur:

```sh
cd apps/mobile
eas build --profile production --platform android
eas build --profile production --platform ios
```
