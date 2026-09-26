const ALLOWED_QUERY = new Set([
  'application_name',
  'channel_binding',
  'connect_timeout',
  'gssencmode',
  'keepalives',
  'keepalives_count',
  'keepalives_idle',
  'keepalives_interval',
  'sslcompression',
  'sslmode',
  'tcp_user_timeout',
]);

export class TargetError extends Error {}

export function readDatabaseUrl(value) {
  if (!value || typeof value !== 'string' || /[\r\n\0\s]/.test(value)) {
    throw new TargetError('bağlantı ayrıştırılamadı');
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TargetError('bağlantı ayrıştırılamadı');
  }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new TargetError('bağlantı ayrıştırılamadı');
  }
  const host = url.hostname;
  if (!host || host.includes(',') || host.includes('/') || host.includes('@')) {
    throw new TargetError('çoklu veya boş host reddedildi');
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database || database.includes('/') || database.includes('?') || database.includes('\0')) {
    throw new TargetError('bağlantı ayrıştırılamadı');
  }
  const user = decodeURIComponent(url.username || '');
  const password = decodeURIComponent(url.password || '');
  if (!user) throw new TargetError('bağlantı ayrıştırılamadı');
  const port = url.port || '5432';
  if (!/^\d+$/.test(port)) throw new TargetError('bağlantı ayrıştırılamadı');

  const seen = new Set();
  const kept = [];
  for (const [rawKey, rawParam] of url.searchParams) {
    const key = rawKey.toLowerCase();
    if (seen.has(key)) throw new TargetError(`hedef değiştiren parametre: ${key}`);
    seen.add(key);
    if (!ALLOWED_QUERY.has(key)) throw new TargetError(`hedef değiştiren parametre: ${key}`);
    kept.push([key, rawParam]);
  }

  const auth = password !== '' ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}` : encodeURIComponent(user);
  const hostPart = host.includes(':') ? `[${host}]` : host;
  const query = kept.map(([key, param]) => `${encodeURIComponent(key)}=${encodeURIComponent(param)}`).join('&');
  const connectionUrl = `postgresql://${auth}@${hostPart}:${port}/${encodeURIComponent(database)}${query ? `?${query}` : ''}`;
  return { host, port, database, user, connectionUrl };
}

export function assertDisposableTarget(targetUrl, productionUrl) {
  const target = readDatabaseUrl(targetUrl);
  const production = readDatabaseUrl(productionUrl);
  if (target.host === production.host && target.port === production.port && target.database === production.database) {
    throw new TargetError('hedef production veritabanı');
  }
  if (!/(restore|disposable)/i.test(target.database)) {
    throw new TargetError('veritabanı adı restore veya disposable içermeli');
  }
  if (!target.user || !production.user || target.user === production.user) {
    throw new TargetError('restore kullanıcısı production kullanıcısından ayrı olmalı');
  }
  return target;
}
