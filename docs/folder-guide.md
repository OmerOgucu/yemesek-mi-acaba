# Nereye koyarım?

| İhtiyaç | Yer |
| --- | --- |
| HTTP kapısı, CORS, statik `/uploads`, genel hız sınırı | `apps/api/src` |
| Hesap, giriş, JWT | `services/auth` |
| Mekan listesi, detay, yeni mekan | `services/restaurants` |
| Şikayet ve yararlı oy | `services/reports` |
| Fotoğraf ve fiş yükleme | `services/evidence` |
| Metin politikası, kanıtın incelenmedi damgası | `services/moderation` |
| Prisma şema, migration, seed | `packages/database` |
| Kategori, skor, bellek içi hız sayacı | `packages/shared` |
| `DATABASE_URL`, JWT, port, uploads yolu | `packages/config` |
| KVKK ve diğer yasal metin | `packages/legal` |
| Site sayfaları | `apps/web/src/app/(public)` ve `app/(auth)` |
| Site arayüz parçaları | `apps/web/src/features/<alan>` |
| Site API istemcisi | `apps/web/src/lib/api` |
| Mobil rotalar | `apps/mobile/app` |
| Mobil ekran, oturum, API istemcisi | `apps/mobile/features/<alan>` |
| Yerel kanıt dosyası | `uploads/` (git’e girmez) |

HTTP DTO’ları ilgili servisin `src/dto` klasöründedir. Paylaşılan enum ve sabitler `packages/shared` içindedir.

Web ve mobil ayrı UI çalıştırır. Ortak bir `packages/ui` yoktur.

Bir Nest alanı `*.module.ts`, `*.service.ts` ve gerekiyorsa `*.controller.ts` ile durur. Moderasyonun herkese açık ucu yoktur; rapor oluşturma `ModerationService.stampEvidence()` çağırır.
