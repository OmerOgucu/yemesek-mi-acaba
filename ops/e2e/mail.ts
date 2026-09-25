export const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

export async function waitMail(to: string, subjectPart: string): Promise<{ subject: string; text: string }> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    const response = await fetch(`http://127.0.0.1:8025/messages?to=${encodeURIComponent(to)}`);
    if (response.ok) {
      const rows = (await response.json()) as { subject: string; text: string }[];
      const hit = rows.find((row) => row.subject.includes(subjectPart));
      if (hit) return hit;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`mail missing: ${subjectPart}`);
}

export function codeFrom(text: string): string {
  const match = text.match(/kodun\s+(\d{6})/);
  if (!match) throw new Error('verification code missing');
  return match[1];
}

export function tokenFrom(text: string): string {
  const match = text.match(/token=([A-Za-z0-9._~-]+)/);
  if (!match) throw new Error('reset token missing');
  return decodeURIComponent(match[1]);
}
