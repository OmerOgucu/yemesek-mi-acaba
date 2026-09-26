import type { PrismaClient } from '@prisma/client';

const ACTIVE = ['PENDING', 'RUNNING'] as const;
const MAX_ATTEMPTS = 8;

export function workerOwner(): string {
  const fromEnv = env().WORKER_ID?.trim();
  if (fromEnv) return fromEnv.slice(0, 80);
  return `pid-${pid()}`;
}

type CleanupDb = Pick<PrismaClient, 'cleanupJob'>;

/** One PENDING/RUNNING row per object. A repeated failure does not grow the queue. */
export async function enqueueCleanup(prisma: CleanupDb, objectKey: string): Promise<'queued' | 'active'> {
  const active = await prisma.cleanupJob.findFirst({
    where: { objectKey, status: { in: [...ACTIVE] } },
    select: { id: true },
  });
  if (active) return 'active';
  try {
    await prisma.cleanupJob.create({ data: { objectKey } });
    return 'queued';
  } catch (error) {
    if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') return 'active';
    throw error;
  }
}

/** Expired RUNNING work returns to the queue. The attempt ceiling becomes FAILED, not a stuck lease. */
export async function reclaimCleanup(prisma: CleanupDb, now = new Date()): Promise<void> {
  await prisma.cleanupJob.updateMany({
    where: { status: 'RUNNING', leaseUntil: { lt: now }, attempts: { gte: MAX_ATTEMPTS } },
    data: { status: 'FAILED', lastError: 'lease expired', leaseOwner: null, leaseUntil: null },
  });
  await prisma.cleanupJob.updateMany({
    where: { status: 'RUNNING', leaseUntil: { lt: now }, attempts: { lt: MAX_ATTEMPTS } },
    data: { status: 'PENDING', leaseOwner: null, leaseUntil: null },
  });
}

export async function processCleanupJobs(
  prisma: CleanupDb,
  deleteFn: (key: string) => Promise<'deleted' | 'missing'>,
  owner = workerOwner(),
  limit = 20,
): Promise<number> {
  await reclaimCleanup(prisma);
  const now = new Date();
  const jobs = await prisma.cleanupJob.findMany({
    where: { status: 'PENDING', nextAttemptAt: { lte: now }, attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
  let done = 0;
  for (const job of jobs) {
    const leaseUntil = new Date(Date.now() + leaseMs());
    const leased = await prisma.cleanupJob.updateMany({
      where: { id: job.id, status: 'PENDING' },
      data: { status: 'RUNNING', leaseOwner: owner, leaseUntil, attempts: { increment: 1 } },
    });
    if (leased.count !== 1) continue;
    try {
      await deleteFn(job.objectKey);
      const wrote = await prisma.cleanupJob.updateMany({
        where: { id: job.id, status: 'RUNNING', leaseOwner: owner },
        data: { status: 'DONE', lastError: null, leaseUntil: null },
      });
      if (wrote.count === 1) done += 1;
    } catch {
      const fresh = await prisma.cleanupJob.findFirst({
        where: { id: job.id, leaseOwner: owner, status: 'RUNNING' },
        select: { attempts: true },
      });
      if (!fresh) continue;
      await prisma.cleanupJob.updateMany({
        where: { id: job.id, leaseOwner: owner, status: 'RUNNING' },
        data: {
          status: fresh.attempts >= MAX_ATTEMPTS ? 'FAILED' : 'PENDING',
          nextAttemptAt: new Date(Date.now() + Math.min(1_000 * 2 ** fresh.attempts, 30 * 60_000)),
          leaseOwner: null,
          leaseUntil: null,
          lastError: 'delete failed',
        },
      });
    }
  }
  return done;
}

function leaseMs(): number {
  const raw = Number(env().JOB_LEASE_MS ?? 60_000);
  if (!Number.isInteger(raw) || raw < 1_000 || raw > 300_000) return 60_000;
  return raw;
}

function env(): Record<string, string | undefined> {
  return runtime().env;
}

function pid(): number {
  return runtime().pid;
}

function runtime(): { env: Record<string, string | undefined>; pid: number } {
  const current = (globalThis as { process?: { env?: Record<string, string | undefined>; pid?: number } }).process;
  return { env: current?.env ?? {}, pid: current?.pid ?? 0 };
}
