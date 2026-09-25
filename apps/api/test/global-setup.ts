import { execSync } from 'child_process';
import path from 'path';

export default function globalSetup(): void {
  const root = path.join(__dirname, '..', '..', '..');
  const databaseUrl = `file:${path.join(root, 'packages/database/prisma/test.db')}`;
  execSync('pnpm exec prisma migrate deploy', {
    cwd: path.join(root, 'packages/database'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
