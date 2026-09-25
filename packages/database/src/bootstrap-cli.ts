import { PrismaClient } from '@prisma/client';
import { assertLaunchConfig } from '@yemesek/config';
import { bootstrapProduction } from './bootstrap';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    assertLaunchConfig(process.env, 'bootstrap');
    const result = await bootstrapProduction(prisma);
    process.stdout.write(`bootstrap ${result}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'bootstrap failed';
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
