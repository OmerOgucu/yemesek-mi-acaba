import path from 'path';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = `file:${path.join(process.cwd(), 'prisma', 'test.db')}`;
