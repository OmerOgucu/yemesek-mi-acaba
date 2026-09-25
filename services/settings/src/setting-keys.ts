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
} as const;

export type SettingKey = keyof typeof SETTING_DEFS;

export function isSettingKey(value: string): value is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTING_DEFS, value);
}
