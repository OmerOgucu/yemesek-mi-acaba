# Nereye koyarım?

| İhtiyaç | Yer |
| --- | --- |
| HTTP kapısı, CORS, statik `/uploads`, hız sınırı, hata zarfı | `apps/api/src` |
| Hesap, giriş, JWT, e-posta doğrulama | `services/auth` |
| Brevo ve yerel e-posta | `services/mail` |
| Mekan listesi, detay, yeni mekan, şehir | `services/restaurants` |
| Şikayet ve yararlı oy | `services/reports` |
| Fotoğraf ve fiş | `services/evidence` |
| Metin politikası, kanıt damgası | `services/moderation` |
| Rozet eşiği | `services/badges` |
| Site ayarı | `services/settings` |
| Yönetim uçları, denetim, talep, destek kutusu | `services/admin` |
| Herkese açık kural, şeffaflık, destek formu | `services/settings` |
| Prisma şema, migration, seed | `packages/database` |
| Kategori, skor, hız sayacı, ortak hata metni | `packages/shared` |
| `DATABASE_URL`, JWT, port, uploads yolu | `packages/config` |
| KVKK ve diğer yasal metin | `packages/legal` |
| Durum, bakım kapısı, çerez tercihi | `apps/web` `/durum`, `MaintenanceGate`, `CookieNotice` |
| İhlal, yedek, DNS, yayın listesi | `docs/breach-response.md`, `docs/backup-restore-drill.md`, `docs/email-dns.md`, `docs/go-live.md` |
| Site sayfaları | `apps/web/src/app/(public)`, `app/(auth)`, `app/admin` |
| Site arayüzü | `apps/web/src/components/<alan>` |
| Site API istemcisi | `apps/web/src/lib/api` |
| Mobil rota | `apps/mobile/app` |
| Mobil ekran, oturum, API, tema | `apps/mobile/features/<alan>` |
| Yerel kanıt dosyası | `uploads/` (ikili dosyalar git’e girmez) |

HTTP DTO’su ilgili servisin `src/dto` klasöründedir. `packages/shared` enum, skor ve ortak hata cümlelerini tutar; istek gövdesini değil.

`services/evidence` kendi rotasını açmaz. Şikayet ucu `report-files.interceptor` ile dosyayı alır. `services/moderation` herkese açık uç açmaz; yeni şikayet `stampEvidence()` ile `evidenceVerified: false` alır.

Web ve mobil ayrı UI çalıştırır. `packages/ui` bu yüzden yok.
