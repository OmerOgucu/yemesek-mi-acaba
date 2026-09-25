const SLURS = [
  'pezevenk',
  'orospu',
  'kahpe',
  'piç',
  'pic',
  'götveren',
  'gotveren',
  'ibne',
  'yavşak',
];

const THREAT =
  /(öldüreceğim|oldurecegim|gebertirim|geberticem|seni öldür|seni oldur)/i;

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE =
  /(?:\+?\s*90|0)?[\s.-]*5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/;
const LONG_DIGITS = /\d{10,}/;
const IBAN = /\bTR\s*\d{2}(?:\s*\d{4}){5}\s*\d{2}\b/i;
const DOOR = /\b(?:no|numara|kapı|kapi|daire|kat)\b\s*[:.]?\s*\d+/i;

export type PolicyIssue = {
  ok: false;
  message: string;
};

export type PolicyOk = { ok: true };

function fold(value: string): string {
  return value.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9]/gi, '');
}

function containsSlur(value: string): boolean {
  const tokens = value
    .toLocaleLowerCase('tr-TR')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((token) => fold(token));
  return SLURS.some((slur) => {
    const foldedSlur = fold(slur);
    return tokens.some(
      (token) => token === foldedSlur || (foldedSlur.length >= 5 && token.includes(foldedSlur)),
    );
  });
}

export function inspectText(
  value: string,
  options?: { addressHint?: boolean },
): PolicyOk | PolicyIssue {
  const trimmed = value.trim();
  if (!trimmed) return { ok: true };

  if (EMAIL.test(trimmed) || PHONE.test(trimmed) || LONG_DIGITS.test(trimmed) || IBAN.test(trimmed)) {
    return {
      ok: false,
      message:
        'Telefon, e-posta, kimlik numarası veya benzeri kişisel veri yazmayın.',
    };
  }

  if (THREAT.test(trimmed)) {
    return {
      ok: false,
      message: 'Tehdit içeren metin kabul edilmez. Olayı anlatın.',
    };
  }

  if (containsSlur(trimmed)) {
    return {
      ok: false,
      message:
        'Kişisel saldırı kabul edilmez. Mekanı ve olanı anlatın, kişiyi hedef almayın.',
    };
  }

  if (options?.addressHint && DOOR.test(trimmed)) {
    return {
      ok: false,
      message: 'Tam adres yerine semt veya mahalle yazın. Kapı numarası olmasın.',
    };
  }

  return { ok: true };
}

export function collectPolicyIssues(
  fields: { value: string | null | undefined; addressHint?: boolean }[],
): string[] {
  const issues: string[] = [];
  for (const field of fields) {
    if (!field.value) continue;
    const result = inspectText(field.value, { addressHint: field.addressHint });
    if (!result.ok && !issues.includes(result.message)) {
      issues.push(result.message);
    }
  }
  return issues;
}
