export function foldTr(value: string): string {
  return value.toLocaleLowerCase('tr-TR');
}

export function placeKey(raw: string): { name: string; key: string } {
  const name = raw.trim().replace(/\s+/g, ' ');
  return { name, key: foldTr(name) };
}

export function normalizeCity(raw: string): { city: string; cityKey: string } {
  const place = placeKey(raw);
  return { city: place.name, cityKey: place.key };
}
