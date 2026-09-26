import { execSync } from 'child_process';
import path from 'path';

export default function globalSetup(): void {
  const root = path.join(__dirname, '..', '..', '..');
  const databaseUrl = process.env.DATABASE_URL ?? 'postgresql://yemesek:yemesek@127.0.0.1:5432/yemesek_test';
  const parsed = new URL(databaseUrl);
  const name = parsed.pathname.replace(/^\//, '');
  if (!name.includes('test') || !['localhost', '127.0.0.1', 'postgres'].includes(parsed.hostname)) {
    throw new Error('Test migrate refused: DATABASE_URL is not an isolated test database.');
  }
  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.join(root, 'packages/database'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
