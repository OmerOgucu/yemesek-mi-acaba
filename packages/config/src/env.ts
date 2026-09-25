import { join } from 'path';

export type AppConfig = {
  nodeEnv: string;
  databaseUrl: string;
  jwtAccessSecret: string;
  port: number;
  uploadsDir: string;
};

export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
}

export function readConfig(): AppConfig {
  const databaseUrl = process.env.DATABASE_URL;
  const jwtAccessSecret = process.env.JWT_ACCESS_SECRET;
  if (!databaseUrl) throw new Error('DATABASE_URL tanımlı değil.');
  if (!jwtAccessSecret) throw new Error('JWT_ACCESS_SECRET tanımlı değil.');

  const port = Number(process.env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT geçersiz.');
  }

  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    databaseUrl,
    jwtAccessSecret,
    port,
    uploadsDir: uploadsDir(),
  };
}
