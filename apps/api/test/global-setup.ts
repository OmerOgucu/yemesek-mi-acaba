import { execSync } from 'child_process';
import path from 'path';

export default function globalSetup(): void {
  const databaseUrl = `file:${path.join(process.cwd(), 'prisma', 'test.db')}`;
  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
