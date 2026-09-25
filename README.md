# Yemesek mi acaba?

Kötü restoran deneyimlerini toplayan kara liste. İstanbul ve KKTC örnekleriyle gelir. Övgü değil, şikayet sıralanır: yüksek **kötülük skoru** daha kötü demektir.

Şikayetler kullanıcı metnidir. Resmi tespit, laboratuvar sonucu veya mahkeme kararı değildir. Telefon, tam adres ve kimlik yazılmaz. Liste herkese açıktır. Şikayet ve yararlı oy için hesap gerekir.

## Çalıştırma

Gerekli: Node 20+, pnpm 10. Mobil için Expo Go veya bir simülatör.

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001

Mobil, ayrı bir terminalde:

```bash
pnpm dev:mobile
```

`EXPO_PUBLIC_API_URL` varsayılanı `http://localhost:3001`. Android emülatörde `http://10.0.2.2:3001` kullanın. iOS simülatör localhost’u görür.

`db:seed` yerel SQLite verisini siler ve örnek mekanları yeniden yazar.

Tek tek:

```bash
pnpm dev:api
pnpm dev:web
pnpm dev:mobile
```

İsteğe bağlı ortam değişkenleri: `apps/api/.env.example`, `apps/web/.env.example`, `apps/mobile/.env.example`.
Varsayılan veritabanı `apps/api/prisma/dev.db`. Yerel JWT sırrı yalnızca geliştirme içindir; yayında değiştirin.

## Demo hesap

Seed bir deneme kullanıcısı açar. Yalnızca yerel geliştirme içindir.

- E-posta: `demo@yemesek.local`
- Parola: `Demo1234!`

Kayıtta KVKK aydınlatma metni ve kullanım koşulları zorunludur. Pazarlama kutusu isteğe bağlıdır ve kaydı engellemez.

## Kontrol

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## API

| Yöntem | Yol | Kim |
| --- | --- | --- |
| GET | `/health` | Herkes |
| POST | `/auth/register` | Herkes, aydınlatma + koşullar zorunlu |
| POST | `/auth/login` | Herkes |
| POST | `/auth/refresh` | Yenileme jetonu |
| POST | `/auth/logout` | Yenileme jetonu |
| GET | `/auth/me` | Giriş |
| PATCH | `/auth/me` | Giriş |
| POST | `/auth/me/delete` | Giriş, parola ile silme |
| GET | `/restaurants?q=&city=` | Herkes, en kötü önce |
| GET | `/restaurants/:id` | Herkes |
| POST | `/restaurants` | Herkes |
| POST | `/restaurants/:id/reports` | Giriş |
| POST | `/reports/:id/votes` | Giriş, kendi şikayetine oy yok |

Parola bcrypt ile özetlenir. Erişim jetonu 15 dakika, yenileme jetonu 30 gün; yenileme jetonunun yalnızca özeti saklanır. Giriş uçları 10 dakikada 8 deneme ile sınırlıdır. Diğer POST istekleri dakikada 20 ile sınırlıdır. Hata gövdesi `statusCode`, `message`, varsa `details` döner; yığın izi dönmez.

Kötülük skoru: şiddet × kategori ağırlığı toplanır, × 8; şikayet sayısı × 6 ve yararlı oy × 2 eklenir. Zehirlenme şüphesi ve hijyen daha ağır basar.

Yasal sayfalar: `/kvkk`, `/gizlilik`, `/kullanim-kosullari`, `/cerez-politikasi`. Aynı metinler mobil uygulamada Profil sekmesinden açılır.
