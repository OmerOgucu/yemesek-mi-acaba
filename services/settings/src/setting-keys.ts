export const SETTING_DEFS = {
  registrationOpen: {
    defaultValue: 'true',
    kind: 'boolean',
    label: 'Yeni kayıtlar açık',
  },
  evidenceHint: {
    defaultValue: 'En az 1 mekan fotoğrafı ve 1 fiş zorunlu. Bu metin kuralı gevşetmez.',
    kind: 'text',
    label: 'Kanıt uyarısı',
  },
  publicReportsNeedReview: {
    defaultValue: 'false',
    kind: 'boolean',
    label: 'Yalnızca incelenmiş şikayetler herkese açık',
  },
  indexPublicReports: {
    defaultValue: 'false',
    kind: 'boolean',
    label: 'Şikayet sayfaları arama motoruna açık',
  },
  pressEmail: {
    defaultValue: 'basin@yemesekmiacaba.com',
    kind: 'text',
    label: 'Basın e-postası',
  },
  pressName: {
    defaultValue: 'Yemesek basın',
    kind: 'text',
    label: 'Basın iletişim adı',
  },
  legalEmail: {
    defaultValue: 'hukuk@yemesekmiacaba.com',
    kind: 'text',
    label: 'Hukuk e-postası',
  },
  supportEmail: {
    defaultValue: 'destek@yemesekmiacaba.com',
    kind: 'text',
    label: 'Destek e-postası',
  },
  admin2faRequired: {
    defaultValue: 'false',
    kind: 'boolean',
    label: 'Yöneticide iki adımlı doğrulama zorunlu',
  },
  evidenceRetentionDays: {
    defaultValue: '30',
    kind: 'number',
    label: 'Kanıt saklama günü',
  },
  voteHourlyCap: {
    defaultValue: '30',
    kind: 'number',
    label: 'Kullanıcı saatlik oy tavanı',
  },
  voteVenueDailyCap: {
    defaultValue: '8',
    kind: 'number',
    label: 'Aynı mekanda günlük oy tavanı',
  },
  maintenanceMode: {
    defaultValue: 'false',
    kind: 'boolean',
    label: 'Bakım modu (herkese açık yazmalar kapalı)',
  },
  minMobileVersion: {
    defaultValue: '',
    kind: 'text',
    allowEmpty: true,
    label: 'En düşük mobil sürüm (boşsa zorunlu değil)',
  },
  minIosBuild: {
    defaultValue: '0',
    kind: 'number',
    min: 0,
    max: 999999,
    label: 'En düşük iOS build (0 kapalı)',
  },
  minAndroidBuild: {
    defaultValue: '0',
    kind: 'number',
    min: 0,
    max: 999999,
    label: 'En düşük Android build (0 kapalı)',
  },
  allowedCities: {
    defaultValue: '',
    kind: 'text',
    allowEmpty: true,
    label: 'Açık şehirler (virgül). Boş değer geliştirmede hepsini açar; production ilk kurulum boş listeyi açmaz.',
  },
  moderationSlaHours: {
    defaultValue: '24',
    kind: 'number',
    min: 1,
    max: 168,
    label: 'Tehdit işaretli şikayet için hedef saat',
  },
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;

export function isSettingKey(value: string): value is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTING_DEFS, value);
}
