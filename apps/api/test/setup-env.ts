import path from 'path';

const root = path.join(process.cwd(), '..', '..');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = `file:${path.join(root, 'packages/database/prisma/test.db')}`;
process.env.JWT_ACCESS_SECRET = 'test-access-secret-not-for-production';
process.env.UPLOADS_DIR = path.join(root, 'uploads-test');
