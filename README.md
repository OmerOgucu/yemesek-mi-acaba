# Yemesek mi acaba?

Kötü restoran deneyimlerini toplayan küçük bir kara liste. İstanbul ve KKTC örnekleriyle gelir. Övgü değil, şikayet sıralanır: yüksek **kötülük skoru** daha kötü demektir.

Şikayetler kullanıcı metnidir. Resmi tespit, laboratuvar sonucu veya mahkeme kararı değildir. Telefon, tam adres ve kimlik yazılmaz.

## Çalıştırma

Gerekli: Node 20+, pnpm 10.

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001

`db:seed` yerel SQLite verisini siler ve örnek mekanları yeniden yazar.

Tek tek:

```bash
pnpm dev:api
pnpm dev:web
```

İsteğe bağlı ortam değişkenleri: `apps/api/.env.example`, `apps/web/.env.example`.
Varsayılan veritabanı `apps/api/prisma/dev.db`, varsayılan API adresi `http://localhost:3001`.

## Kontrol

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## API

| Yöntem | Yol | İş |
| --- | --- | --- |
| GET | `/health` | Sağlık |
| GET | `/restaurants?q=&city=` | Liste, en kötü önce |
| GET | `/restaurants/:id` | Mekan ve şikayetler |
| POST | `/restaurants` | Mekan ekle |
| POST | `/restaurants/:id/reports` | Şikayet |
| POST | `/reports/:id/votes` | Yararlı oyu |

POST istekleri dakikada 20 ile sınırlıdır. Hata gövdesi `statusCode`, `message`, varsa `details` döner; yığın izi dönmez.

Kötülük skoru: şiddet × kategori ağırlığı toplanır, × 8; şikayet sayısı × 6 ve yararlı oy × 2 eklenir. Zehirlenme şüphesi ve hijyen daha ağır basar.
