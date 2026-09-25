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
    defaultValue: 'basin@yemesek.example',
    kind: 'text',
    label: 'Basın e-postası',
  },
  pressName: {
    defaultValue: 'Yemesek basın',
    kind: 'text',
    label: 'Basın iletişim adı',
  },
  legalEmail: {
    defaultValue: 'hukuk@yemesek.example',
    kind: 'text',
    label: 'Hukuk e-postası',
  },
  supportEmail: {
    defaultValue: 'destek@yemesek.example',
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
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;

export function isSettingKey(value: string): value is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTING_DEFS, value);
}
