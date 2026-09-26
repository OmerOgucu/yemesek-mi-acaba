export function sqlIdent(value) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value || '')) throw new Error('kimlik geçersiz');
  return value;
}

export function sqlLiteral(value) {
  if (typeof value !== 'string' || value.length === 0 || value.length > 200 || /[\r\n\0$]/.test(value)) {
    throw new Error('parola geçersiz');
  }
  return `'${value.replace(/'/g, "''")}'`;
}

export function buildDisposableSql({ user, database, password, appUser, appDatabase }) {
  const restoreUser = sqlIdent(user);
  const restoreDb = sqlIdent(database);
  const owner = sqlIdent(appUser);
  const appDb = sqlIdent(appDatabase);
  if (restoreDb === appDb) throw new Error('hedef production veritabanı');
  if (restoreUser === owner) throw new Error('restore kullanıcısı production kullanıcısından ayrı olmalı');
  const pass = sqlLiteral(password);
  const role = [
    'DO $do$',
    'BEGIN',
    `  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${restoreUser}') THEN`,
    `    CREATE ROLE ${restoreUser} LOGIN PASSWORD ${pass} NOSUPERUSER NOCREATEDB NOCREATEROLE;`,
    '  ELSE',
    `    ALTER ROLE ${restoreUser} WITH LOGIN PASSWORD ${pass} NOSUPERUSER NOCREATEDB NOCREATEROLE;`,
    '  END IF;',
    'END',
    '$do$;',
    '',
  ].join('\n');
  const grants = [
    `GRANT CONNECT ON DATABASE ${appDb} TO ${owner};`,
    `GRANT CONNECT, TEMP ON DATABASE ${restoreDb} TO ${restoreUser};`,
    `REVOKE CONNECT ON DATABASE ${appDb} FROM PUBLIC;`,
    `REVOKE CONNECT ON DATABASE ${appDb} FROM ${restoreUser};`,
    '',
  ].join('\n');
  if (grants.includes(`GRANT CONNECT ON DATABASE ${appDb} TO ${restoreUser}`)) {
    throw new Error('restore kullanıcısına production bağlantısı verilemez');
  }
  return { role, grants, user: restoreUser, database: restoreDb, appUser: owner, appDatabase: appDb };
}
