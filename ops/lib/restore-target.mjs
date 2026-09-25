export function parseDatabaseUrl(value) {
  if (!value || typeof value !== 'string') return null;
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') return null;
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database || database.includes('/') || database.includes('?')) return null;
  const host = url.hostname;
  if (!host) return null;
  return {
    host,
    port: url.port || '5432',
    database,
    user: decodeURIComponent(url.username || ''),
  };
}

export function assertDisposableTarget(targetUrl, productionUrl) {
  const target = parseDatabaseUrl(targetUrl);
  const production = parseDatabaseUrl(productionUrl);
  if (!target || !production) throw new Error('bağlantı ayrıştırılamadı');
  if (target.host === production.host && target.port === production.port && target.database === production.database) {
    throw new Error('hedef production veritabanı');
  }
  if (!/(restore|disposable)/i.test(target.database)) {
    throw new Error('veritabanı adı restore veya disposable içermeli');
  }
  if (!target.user || !production.user || target.user === production.user) {
    throw new Error('restore kullanıcısı production kullanıcısından ayrı olmalı');
  }
  return target;
}
