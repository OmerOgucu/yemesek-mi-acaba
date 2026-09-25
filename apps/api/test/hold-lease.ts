import { PrismaClient } from '@prisma/client';
import { processCleanupJobs } from '../../../packages/database/src/cleanup-queue';

const key = process.env.HOLD_OBJECT_KEY;
if (!key) {
  process.stderr.write('HOLD_OBJECT_KEY missing\n');
  process.exit(1);
}

const prisma = new PrismaClient();

void processCleanupJobs(prisma, async (objectKey) => {
  if (objectKey !== key) return 'missing';
  await new Promise(() => undefined);
  return 'deleted';
}).finally(() => undefined);
