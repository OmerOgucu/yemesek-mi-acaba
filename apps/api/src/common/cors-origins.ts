const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:8081',
  'http://127.0.0.1:8081',
];

export function resolveCorsOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : [...LOCAL_ORIGINS];
}
