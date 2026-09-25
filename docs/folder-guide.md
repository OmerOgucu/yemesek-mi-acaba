# Nereye koyarım?

| İhtiyaç | Yer |
| --- | --- |
| HTTP kapısı, CORS, statik `/uploads`, hız sınırı, hata zarfı | `apps/api/src` |
| Hesap, giriş, JWT | `services/auth` |
| Mekan listesi, detay, yeni mekan | `services/restaurants` |
| Şikayet ve yararlı oy | `services/reports` |
| Fotoğraf ve fiş | `services/evidence` |
| Metin politikası, kanıt damgası | `services/moderation` |
| Prisma şema, migration, seed | `packages/database` |
| Kategori, skor, hız sayacı, ortak hata metni | `packages/shared` |
| `DATABASE_URL`, JWT, port, uploads yolu | `packages/config` |
| KVKK ve diğer yasal metin | `packages/legal` |
| Site sayfaları | `apps/web/src/app/(public)` ve `app/(auth)` |
| Site arayüzü | `apps/web/src/components/<alan>` |
| Site API istemcisi | `apps/web/src/lib/api` |
| Mobil rota | `apps/mobile/app` |
| Mobil ekran, oturum, API, tema | `apps/mobile/features/<alan>` |
| Yerel kanıt dosyası | `uploads/` (ikili dosyalar git’e girmez) |

HTTP DTO’su ilgili servisin `src/dto` klasöründedir. `packages/shared` enum, skor ve ortak hata cümlelerini tutar; istek gövdesini değil.

`services/evidence` kendi rotasını açmaz. Şikayet ucu `report-files.interceptor` ile dosyayı alır. `services/moderation` herkese açık uç açmaz; yeni şikayet `stampEvidence()` ile `evidenceVerified: false` alır.

Web ve mobil ayrı UI çalıştırır. `packages/ui` bu yüzden yok.
