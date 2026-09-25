const PLACEHOLDER = /\{\{\s*(code|verifyUrl|displayName|appName)\s*\}\}/g;

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function renderTemplate(source: string, vars: Record<string, string>, html: boolean): string {
  return source.replace(PLACEHOLDER, (_match, key: string) => {
    const value = vars[key] ?? '';
    return html ? escapeHtml(value) : value;
  });
}
