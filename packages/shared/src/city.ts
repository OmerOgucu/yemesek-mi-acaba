export function foldTr(value: string): string {
  return value.toLocaleLowerCase('tr-TR');
}

export function normalizeCity(raw: string): { city: string; cityKey: string } {
  const city = raw.trim().replace(/\s+/g, ' ');
  return { city, cityKey: foldTr(city) };
}
