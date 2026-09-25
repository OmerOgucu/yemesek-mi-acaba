import { ReportCategory } from '@prisma/client';

export type SeedReport = {
  category: ReportCategory;
  severity: number;
  title: string;
  body: string;
  nickname: string;
  votes: number;
  daysAgo: number;
};

export type SeedRestaurant = {
  name: string;
  city: string;
  district: string;
  addressHint: string;
  cuisine: string;
  daysAgo: number;
  reports: SeedReport[];
};

export const SEED_RESTAURANTS: SeedRestaurant[] = [
  {
    name: 'Örnek Lokantası',
    city: 'Örnekşehir',
    district: 'Merkez',
    addressHint: 'çarşı içi',
    cuisine: 'Ev yemeği',
    daysAgo: 30,
    reports: [
      {
        category: ReportCategory.HYGIENE,
        severity: 4,
        title: 'Tezgah ıslak ve yapış yapış',
        body: 'Öğle servisinde tezgah silinmemişti. Kaşıklar açıkta duruyordu. Yemeği yedik ama bir daha oturmam.',
        nickname: 'öğle müşterisi',
        votes: 3,
        daysAgo: 8,
      },
    ],
  },
  {
    name: 'Deneme Izgarası',
    city: 'Denemekent',
    district: 'Sahil',
    addressHint: 'sahil yolu',
    cuisine: 'Izgara',
    daysAgo: 24,
    reports: [
      {
        category: ReportCategory.WRONG_OR_COLD,
        severity: 3,
        title: 'Köfte soğuk geldi',
        body: 'Sipariş yarım saat sonra geldi ve tabak ılıktı. Garson özür diledi, mutfak yeni tabak çıkarmadı.',
        nickname: 'masa 4',
        votes: 2,
        daysAgo: 5,
      },
    ],
  },
  {
    name: 'Sessiz Çorba',
    city: 'Örnekşehir',
    district: 'Çarşı',
    addressHint: 'çarşı arkası',
    cuisine: 'Çorba',
    daysAgo: 18,
    reports: [
      {
        category: ReportCategory.SCAM_PRICING,
        severity: 4,
        title: 'Hesap menüden pahalı',
        body: 'İki çorba ve bir salata, duvardaki listeden belirgin pahalıydı. Farkı sorduğumuzda servis bedeli dendi, listede yazmıyordu.',
        nickname: 'hesap bakan',
        votes: 1,
        daysAgo: 3,
      },
    ],
  },
  {
    name: 'Gece Büfe',
    city: 'Denemekent',
    district: 'Garaj',
    addressHint: 'garaj yanı',
    cuisine: 'Büfe',
    daysAgo: 12,
    reports: [
      {
        category: ReportCategory.RUDE_SERVICE,
        severity: 2,
        title: 'Kısa ve ters cevap',
        body: 'Gece dürüm istedik. Sıra varken ters bir cevap aldık. Ürün geldi, tartışma uzamadı.',
        nickname: 'gece vardiyası',
        votes: 0,
        daysAgo: 1,
      },
    ],
  },
];
