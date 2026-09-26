export const ONBOARDING_STORAGE_KEY = 'yemesek.intro';

export type OnboardingStep = {
  id: string;
  kicker: string;
  title: string;
  paragraphs: string[];
};

export const ONBOARDING_STEPS: readonly OnboardingStep[] = [
  {
    id: 'neden-var',
    kicker: 'Neden var',
    title: 'Bu tahta neden duruyor?',
    paragraphs: [
      'Yemesek mi acaba, gönüllü bir topluluk hizmetidir. Şirket değildir; tüzel kişilik yoktur. Yasal metinlerde veri sorumlusu “proje yürütücüsü” diye durur.',
      'Burası övgü sitesi değil. Kanıtlı kötü mekan deneyimi yazılır. Yüksek kötülük skoru daha kötü demektir.',
    ],
  },
  {
    id: 'neden-kuruldu',
    kicker: 'Neden kuruldu',
    title: 'Yıldız tok karınla yazılır.',
    paragraphs: [
      'Menü parlar, hesap ve fiş konuşmaz. Hijyen, zehirlenme şüphesi, soğuk tabak, kaba hizmet ve yanıltıcı reklam yıldızların altında kaybolur.',
      'Bu tahta onu tersine çevirir. Buradaki yazı resmi denetim, laboratuvar sonucu veya mahkeme kararı değildir.',
    ],
  },
  {
    id: 'nasil',
    kicker: 'Nasıl kullanılır',
    title: 'Önce liste, sonra mekan.',
    paragraphs: [
      'Liste en kötüden açılır. Mekana gir, şikayetleri oku.',
      '“Kanıtlı” rozeti fotoğraf ve fişin durduğunu söyler. “Moderatör onaylı” ayrıdır: gönüllü incelemedir, resmi tespit değildir.',
    ],
  },
  {
    id: 'ne-yap',
    kicker: 'Ne yapmalısın',
    title: 'Oku. Gerekirse yaz.',
    paragraphs: [
      'Şikayet ve yararlı oy için kayıt ol, e-postanı doğrula. Mekan yoksa şehir ve ilçeyle ekle.',
      'Şikayete yemek ya da mekan fotoğrafı ve fiş şart. Oyu ancak okuduğun şikayete, dikkatle ver.',
    ],
  },
  {
    id: 'kurallar',
    kicker: 'Kurallar',
    title: 'Mekanı anlat, insanı avlama.',
    paragraphs: [
      'Hakaret, tehdit, telefon, kimlik ve tam adres yok. Deneyim mekana yazılır; kişi avı yok.',
      'İşletme yanıt yazabilir. Yanıt sırayı satın almaz. Ayrıntı topluluk kurallarında.',
    ],
  },
];
