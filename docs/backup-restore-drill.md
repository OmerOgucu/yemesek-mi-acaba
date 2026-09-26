# Yedek ve geri yükleme provası

Production verisiyle oynama. Prova, kopya üzerinde yapılır.

## Al

1. Postgres için `pg_dump --format=custom` ile bir dosya al. Dosyayı uygulama sunucusunun diskine tek kopya olarak bırakma.
2. Kanıt kovası ayrıdır. Veritabanı yedeği dosyayı geri getirmez. Kovanın kendi sürümlemesi veya ikinci kova kopyası gerekir.
3. Yedeğin saatini ve hangi migration’a denk geldiğini yaz.

## Geri yükle (prova)

1. Boş bir veritabanı aç. Production bağlantı dizesini kullanma.
2. `pg_restore --dbname=... yedek.dump`.
3. Uygulama kodunu yedeğin alındığı sürüme getir. `pnpm --filter @yemesek/database exec prisma migrate deploy` yalnız eksik migration varsa.
4. `GET /health` `ok` dönsün. Bir mekan, bir şikayet ve bir kullanıcı sayısı, yedek notundaki sayıya uysun.
5. Prova bittiğinde prova veritabanını kapat. Production’a bu dizeyi yazma.

SQLite yerel geliştirme içindir. Onun kopyası yayın provası sayılmaz.
