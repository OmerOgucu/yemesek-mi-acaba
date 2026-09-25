import { spawn } from 'child_process';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { JobsService } from '../src/jobs/jobs.service';
import { enqueueCleanup, processCleanupJobs, reclaimCleanup } from '@yemesek/database';
import { MailService } from '@yemesek/mail';
import { PrismaService } from '@yemesek/database';

const prisma = new PrismaClient();
const objectKey = 'evidence/0123456789abcdef0123456789abcdef.jpg';

describe('queue crash recovery', () => {
  beforeEach(async () => {
    await prisma.cleanupJob.deleteMany();
    await prisma.mailJob.deleteMany();
  });

  afterAll(async () => {
    await prisma.cleanupJob.deleteMany();
    await prisma.mailJob.deleteMany();
    await prisma.$disconnect();
  });

  it('reclaims an expired running cleanup and fails at the attempt ceiling', async () => {
    await prisma.cleanupJob.create({
      data: { objectKey, status: 'RUNNING', attempts: 1, leaseOwner: 'dead', leaseUntil: new Date(Date.now() - 1000) },
    });
    await reclaimCleanup(prisma);
    const pending = await prisma.cleanupJob.findFirstOrThrow({ where: { objectKey } });
    expect(pending.status).toBe('PENDING');
    expect(pending.leaseOwner).toBeNull();

    await prisma.cleanupJob.update({
      where: { id: pending.id },
      data: { status: 'RUNNING', attempts: 8, leaseOwner: 'dead', leaseUntil: new Date(Date.now() - 1000) },
    });
    await reclaimCleanup(prisma);
    const failed = await prisma.cleanupJob.findFirstOrThrow({ where: { id: pending.id } });
    expect(failed.status).toBe('FAILED');
  });

  it('keeps one active cleanup row when storage keeps failing, then completes', async () => {
    expect(await enqueueCleanup(prisma, objectKey)).toBe('queued');
    expect(await enqueueCleanup(prisma, objectKey)).toBe('active');
    expect(await prisma.cleanupJob.count({ where: { objectKey } })).toBe(1);

    for (let i = 0; i < 5; i += 1) {
      await processCleanupJobs(prisma, async () => {
        throw new Error('storage down');
      });
    }
    expect(await prisma.cleanupJob.count({ where: { objectKey } })).toBe(1);
    const retrying = await prisma.cleanupJob.findFirstOrThrow({ where: { objectKey } });
    expect(retrying.status === 'PENDING' || retrying.status === 'FAILED').toBe(true);

    await prisma.cleanupJob.update({ where: { id: retrying.id }, data: { status: 'PENDING', attempts: 1, nextAttemptAt: new Date() } });
    const done = await processCleanupJobs(prisma, async () => 'missing');
    expect(done).toBe(1);
    expect((await prisma.cleanupJob.findFirstOrThrow({ where: { objectKey } })).status).toBe('DONE');
    expect(await prisma.cleanupJob.count({ where: { objectKey } })).toBe(1);
  });

  it('kills a worker after it leases a job and the next pass reclaims it', async () => {
    const key = 'evidence/abcdef0123456789abcdef0123456789.jpg';
    await prisma.cleanupJob.create({ data: { objectKey: key, status: 'PENDING' } });
    const root = path.join(__dirname, '..', '..', '..');
    const child = spawn('pnpm', ['--filter', '@yemesek/database', 'exec', 'tsx', path.join(root, 'apps/api/test/hold-lease.ts')], {
      cwd: root,
      env: {
        ...process.env,
        HOLD_OBJECT_KEY: key,
        JOB_LEASE_MS: '1500',
        WORKER_ID: 'victim',
      },
      stdio: 'ignore',
    });
    try {
      const leased = await waitFor(async () => {
        const row = await prisma.cleanupJob.findFirst({ where: { objectKey: key } });
        return row?.status === 'RUNNING' ? row : null;
      });
      expect(leased.leaseOwner).toBe('victim');
      child.kill('SIGKILL');
      await new Promise((resolve) => setTimeout(resolve, 1800));
      await reclaimCleanup(prisma);
      const row = await prisma.cleanupJob.findFirstOrThrow({ where: { objectKey: key } });
      expect(row.status).toBe('PENDING');
      expect(row.leaseOwner).toBeNull();
      expect(await prisma.cleanupJob.count({ where: { objectKey: key } })).toBe(1);
    } finally {
      if (!child.killed) child.kill('SIGKILL');
    }
  }, 30_000);

  it('ends a fifth-attempt mail crash as FAILED and does not send an expired job', async () => {
    const future = new Date(Date.now() + 60 * 60_000);
    const past = new Date(Date.now() - 60_000);
    const crashed = await prisma.mailJob.create({
      data: {
        dedupeKey: 'crash-fifth',
        toEmail: 'queue-recovery@example.com',
        subject: 'fifth',
        textBody: 'body',
        htmlBody: '<p>body</p>',
        status: 'SENDING',
        attempts: 5,
        leaseOwner: 'dead',
        leaseUntil: past,
        expiresAt: future,
      },
    });
    const retry = await prisma.mailJob.create({
      data: {
        dedupeKey: 'crash-fourth',
        toEmail: 'queue-recovery@example.com',
        subject: 'fourth',
        textBody: 'body',
        htmlBody: '<p>body</p>',
        status: 'SENDING',
        attempts: 4,
        leaseOwner: 'dead',
        leaseUntil: past,
        expiresAt: future,
        nextAttemptAt: new Date(Date.now() + 60 * 60_000),
      },
    });
    const expired = await prisma.mailJob.create({
      data: {
        dedupeKey: 'already-expired',
        toEmail: 'queue-recovery@example.com',
        subject: 'expired',
        textBody: 'do-not-send',
        htmlBody: '<p>do-not-send</p>',
        status: 'SENDING',
        attempts: 1,
        leaseOwner: 'dead',
        leaseUntil: past,
        expiresAt: past,
      },
    });
    const mail = new MailService(prisma as unknown as PrismaService);
    await mail.processDue(10);
    expect((await prisma.mailJob.findUniqueOrThrow({ where: { id: crashed.id } })).status).toBe('FAILED');
    expect((await prisma.mailJob.findUniqueOrThrow({ where: { id: retry.id } })).status).toBe('PENDING');
    expect((await prisma.mailJob.findUniqueOrThrow({ where: { id: expired.id } })).status).toBe('EXPIRED');
    expect((await prisma.mailJob.findUniqueOrThrow({ where: { id: expired.id } })).sentAt).toBeNull();
  });

  it('treats a fresh worker tick as progress even when the queue is empty, and a stale tick as down', async () => {
    const previousEnv = process.env.NODE_ENV;
    const previousWorker = process.env.RUN_WORKER;
    process.env.NODE_ENV = 'production';
    process.env.RUN_WORKER = 'true';
    try {
      const jobs = new JobsService({} as PrismaService, {} as MailService);
      expect(jobs.heartbeatOk()).toBe(true);
      const stale = jobs as unknown as { lastTickAt: number; bootedAt: number };
      stale.lastTickAt = Date.now() - 120_000;
      stale.bootedAt = Date.now() - 120_000;
      expect(jobs.heartbeatOk()).toBe(false);
      const fresh = new JobsService(prisma as unknown as PrismaService, new MailService(prisma as unknown as PrismaService));
      await fresh.tick();
      expect(fresh.heartbeatOk()).toBe(true);
    } finally {
      process.env.NODE_ENV = previousEnv;
      if (previousWorker === undefined) delete process.env.RUN_WORKER;
      else process.env.RUN_WORKER = previousWorker;
    }
  });
});

async function waitFor<T>(read: () => Promise<T | null>): Promise<T> {
  const started = Date.now();
  while (Date.now() - started < 20_000) {
    const value = await read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('lease was not taken');
}
