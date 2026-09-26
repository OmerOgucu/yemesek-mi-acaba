export const CATEGORIES = [
  { id: 'FOOD_POISONING', label: 'Gıda zehirlenmesi şüphesi' },
  { id: 'HYGIENE', label: 'Hijyen' },
  { id: 'SCAM_PRICING', label: 'Şaibeli fiyat' },
  { id: 'FALSE_ADS', label: 'Yanıltıcı reklam' },
  { id: 'WRONG_OR_COLD', label: 'Yanlış veya soğuk sipariş' },
  { id: 'RUDE_SERVICE', label: 'Kaba hizmet' },
] as const;

export const SEVERITY_OPTIONS = [
  { value: 1, label: 'Ufak tatsızlık' },
  { value: 2, label: 'Can sıkıcı' },
  { value: 3, label: 'Ciddi' },
  { value: 4, label: 'Berbat' },
  { value: 5, label: 'Kaç kaç' },
] as const;

export function severityLabel(value: number): string {
  return SEVERITY_OPTIONS.find((option) => option.value === value)?.label ?? String(value);
}
