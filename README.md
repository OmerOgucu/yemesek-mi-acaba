# Yemesek mi acaba?

Kötü restoran deneyimlerini toplayan kara liste. Konum, mekan eklerken yazılan şehir ve ilçeden çıkar; ilk yazım kalıcıdır. Övgü değil, şikayet sıralanır: yüksek **kötülük skoru** daha kötü demektir.

Şikayetler kullanıcı metnidir. Resmi tespit, laboratuvar sonucu veya mahkeme kararı değildir. Telefon, tam adres ve kimlik yazılmaz. Liste herkese açıktır. Giriş yapılabilir; mekan eklemek, şikayet ve yararlı oy e-posta doğrulaması ister. Şikayet ancak en az bir fotoğraf ve fiş/fatura görseliyle açılır.

Herkese açık adres: https://yemesekmiacaba.com

Marka dosyaları `apps/web/public/brand` ve `apps/mobile/assets/brand` altındadır (kelime işareti, iğne, uygulama ikonu, favicon ve paylaşım görseli). Renkler: ana `#8B1E1E`, vurgu `#C9A962`, metin `#2E2E2E`, zemin `#F9F4EA`. Web bunları CSS değişkeni olarak, mobil `apps/mobile/features/theme/theme.ts` içinde kullanır.

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
Varsayılan veritabanı `packages/database/prisma/dev.db`. Yerel JWT sırrı yalnızca geliştirme içindir; yayında değiştirin.

## Klasörler

Bir özellik arıyorsan önce bu tabloya bak. Ayrıntı: [docs/folder-guide.md](docs/folder-guide.md). Sahiplik: [docs/architecture.md](docs/architecture.md).

| İhtiyaç | Yer |
| --- | --- |
| HTTP kapısı | `apps/api` |
| Hesap ve e-posta doğrulama | `services/auth` |
| E-posta (Brevo veya yerel günlük) | `services/mail` |
| Mekan ve şehir | `services/restaurants` |
| Şikayet ve oy | `services/reports` |
| Fotoğraf ve fiş | `services/evidence` |
| Metin politikası | `services/moderation` |
| Rozet | `services/badges` |
| Site ayarı | `services/settings` |
| Yönetim uçları | `services/admin` |
| Veritabanı | `packages/database` |
| Skor ve ortak sabit | `packages/shared` |
| Ortam değişkeni | `packages/config` |
| Yasal metin | `packages/legal` |
| Site sayfası | `apps/web/src/app/(public)`, `app/(auth)` veya `app/admin` |
| Site parçası | `apps/web/src/components/<alan>` |
| Mobil ekran | `apps/mobile/features/<alan>` |
| Kanıt dosyası | `uploads/` |

## Demo hesap

Seed bir deneme kullanıcısı açar. Parolalar yalnızca bu makine içindir. Yayına, ekran görüntüsüne veya paylaşılan bir veritabanına taşıma. Production’da `pnpm db:seed` çalıştırma.

GitHub’da `main` için dal koruması (pull request zorunlu, doğrudan itme kapalı) bu depodan açılamaz. Ayar, depo sahibi tarafından GitHub → Settings → Branches üzerinden yapılır.

- E-posta: `demo@yemesek.local`
- Parola: `Demo1234!`

Yerel yönetici, yalnızca bu makine içindir. Parolayı yayına taşıma.

- E-posta: `admin@yemesek.local`
- Parola: `Admin1234!`
- Panel: http://localhost:3000/admin

Yerel moderatör inceleme kuyruğunu görür, ayar ve rol değiştirmez.

- E-posta: `moderator@yemesek.local`
- Parola: `Mod1234!`

Kayıtta 18 yaş onayı, KVKK aydınlatma metni ve kullanım koşulları zorunludur. Pazarlama kutusu isteğe bağlıdır ve kaydı engellemez. Kayıt doğrulama e-postası gönderir. `BREVO_API_KEY` yoksa kod ve bağlantı API günlüğüne yazılır; `GET /auth/dev/verification?email=` yalnızca geliştirmede cevap verir.

Giriş, e-posta doğrulanmadan da olur. Mekan, şikayet ve oy doğrulama ister. Bu, doğrulanmamış hesapla listeyi okumaya izin verip yazmayı kapatan varsayılandır.

## Kontrol

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm audit:deps
```

## API

| Yöntem | Yol | Kim |
| --- | --- | --- |
| GET | `/health` | Herkes. Yalnızca `ok` ve çalışma süresi. |
| GET | `/auth/me/export` | Giriş. Yalnızca çağıranın verisi. |
| POST | `/auth/me/marketing` | Giriş. Pazarlama rızasını verir veya geri alır. |
| POST | `/auth/register` | Herkes, aydınlatma + koşullar zorunlu |
| POST | `/auth/login` | Herkes |
| POST | `/auth/refresh` | Yenileme jetonu |
| POST | `/auth/logout` | Yenileme jetonu |
| GET | `/auth/me` | Giriş |
| PATCH | `/auth/me` | Giriş |
| POST | `/auth/me/delete` | Giriş, parola ile silme |
| GET | `/restaurants?q=&city=` | Herkes, en kötü önce |
| GET | `/restaurants/:id` | Herkes |
| POST | `/restaurants` | Giriş ve doğrulanmış e-posta |
| POST | `/restaurants/:id/reports` | Giriş ve doğrulanmış e-posta, multipart: en az 1 fotoğraf (`photos`) ve fiş (`receipt`) |
| POST | `/reports/:id/votes` | Giriş ve doğrulanmış e-posta, kendi şikayetine oy yok |
| POST | `/auth/verify` | Giriş, 6 haneli kod |
| POST | `/auth/verify-link` | Sihirli bağlantı jetonu |
| POST | `/auth/verify/resend` | Giriş, hız sınırlı |
| GET | `/auth/dev/verification` | Yalnızca geliştirme, Brevo anahtarı yokken |
| GET | `/admin/ops` | Yalnızca `ADMIN`. Bakım ve e-posta yapılandırması burada. |
| GET | `/admin/*` | `ADMIN` veya `MODERATOR`. Ayar ve rol yalnızca `ADMIN`. |

Şehir ve ilçe ikisi de zorunludur. Eşleşme: boşluklar kırpılır, art arda boşluk teke iner, Türkçe küçük harfe katlanır (`toLocaleLowerCase('tr-TR')`). Aynı anahtara düşen sonraki mekan yeni şehir veya ilçe açmaz; ilk kaydın yazımına bağlanır. Örnek: `Ankara` / `Çankaya` ile ` ankara ` / `çankaya` tek konumdur. Filtre bu tablodan şehir → ilçe listesi döner.

Yönetim paneli ayrı bir mobil veritabanı değildir. Ayar, rozet, inceleme, e-posta şablonu, mekan veya şikayet gizleme, konum ve denetim kaydı aynı API’ye yazılır. Web, Expo iOS ve Android aynı veriyi okur. Mobilde ayrı bir yönetim ekranı yoktur.

Parola sıfırlama, hesap silme (anonimleştirme), işletme talebi ve yanıt, moderatör rolü, denetim kaydı ve noindex şikayet sayfaları bu sürümde vardır. Harita, reklam ve Apple ile giriş yoktur. Yayın listesi `docs/deploy.md`.

Katkı puanı: şikayet × 10, alınan yararlı oy × 3, eklenen mekan × 8, verilen yararlı oy × 1. Rozetler bu sayaçların eşiğine göre otomatik verilir. Elle verilen veya geri alınan rozet `MANUAL` kalır ve otomatik hesap onu bozmaz.

Yayın notları: [docs/deploy.md](docs/deploy.md).

Parola bcrypt ile özetlenir. Erişim jetonu 15 dakika, yenileme jetonu 30 gün; yenileme jetonunun yalnızca özeti saklanır. Giriş uçları 10 dakikada 8 deneme ile sınırlıdır. Veri indirme, destek formu ve işletme talebi 10 dakikada 5. Diğer POST istekleri dakikada 20 ile sınırlıdır. Hata gövdesi `statusCode`, `message`, varsa `details` döner; yığın izi dönmez.

Kötülük skoru: şiddet × kategori ağırlığı toplanır, × 8; şikayet sayısı × 6 ve yararlı oy × 2 eklenir. Zehirlenme şüphesi ve hijyen daha ağır basar.

Yasal sayfalar: `/kvkk`, `/gizlilik`, `/kullanim-kosullari`, `/cerez-politikasi`. Aynı metinler mobil uygulamada Profil sekmesinden açılır.

Kanıt dosyaları bu MVP'de depo kökündeki `uploads/` klasöründe durur ve API üzerinden `/uploads/reports/<32 hex>.jpg|png|webp` adresinden sunulur. Dizin listelenmez. JPEG, PNG ve WebP kabul edilir; dosya başı sınır 5 MB'dir. Dosya adı istemciden alınmaz. `evidenceVerified` varsayılanı kapalıdır: yükleme, bir incelemenin geçtiği anlamına gelmez. Yayında bu klasörün yerine sahiplik kontrolü olan bir nesne deposu kullanılmalıdır. Seed, örnek şikayetlere yer tutucu görseller yazar ve production’da `ALLOW_PRODUCTION_SEED=true` olmadan çalışmaz.

Herkese açık yüzey: [docs/public-surface.md](docs/public-surface.md).

## Android deneme APK

Telefonda `localhost` API’ye ulaşmaz. Derlemeden önce makinenin yerel IP’sini yaz:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=http://192.168.1.10:3001 npx eas-cli build -p android --profile preview
```

Profil `apps/mobile/eas.json` içinde `preview` ve APK üretir. Bilinmeyen kaynaklardan yüklemeyi telefonda aç. Aynı komutun yerel karşılığı, Android SDK kuruluysa: `npx expo run:android --variant release`.
