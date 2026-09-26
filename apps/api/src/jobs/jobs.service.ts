import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { enqueueCleanup, PrismaService, processCleanupJobs, workerOwner } from '@yemesek/database';
import { deleteObject, isObjectKey, photoUrlList } from '@yemesek/evidence';
import { MailService } from '@yemesek/mail';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private tickPromise: Promise<void> | null = null;
  private stopping = false;
  private lastTickAt = 0;
  private readonly bootedAt = Date.now();

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test' || process.env.RUN_WORKER === 'false') return;
    const tickMs = tickInterval();
    this.timer = setInterval(() => {
      void this.tick();
    }, tickMs);
    this.timer.unref?.();
    void this.tick();
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    if (this.tickPromise) await this.tickPromise;
  }

  /** Fresh while the timer is running. An empty queue is still a tick. A stuck timer is not. */
  heartbeatOk(): boolean {
    if (process.env.RUN_WORKER === 'false' || process.env.NODE_ENV === 'test') return true;
    if (this.lastTickAt > 0) return Date.now() - this.lastTickAt < tickInterval() * 3;
    return Date.now() - this.bootedAt < 45_000;
  }

  async tick(): Promise<void> {
    if (this.stopping || this.tickPromise) return;
    this.tickPromise = this.runTick().finally(() => {
      this.tickPromise = null;
    });
    await this.tickPromise;
  }

  private async runTick(): Promise<void> {
    try {
      await this.mail.processDue(10);
      await processCleanupJobs(this.prisma, (key) => this.removeKey(key), workerOwner());
      await this.purgeDueEvidence();
      await this.dropStaleStaged();
    } catch (error) {
      const message = error instanceof Error ? error.name : 'job';
      console.error(`[jobs] ${message}`);
    } finally {
      this.lastTickAt = Date.now();
    }
  }

  private async removeKey(key: string): Promise<'deleted' | 'missing'> {
    if (!isObjectKey(key)) return 'missing';
    return withTimeout(deleteObject(key), timeoutMs());
  }

  private async purgeDueEvidence(): Promise<void> {
    const due = await this.prisma.report.findMany({
      where: { evidencePurgeAfter: { lte: new Date() } },
      select: { id: true, photoUrls: true, receiptUrl: true },
      take: 20,
    });
    for (const report of due) {
      const keys = [...photoUrlList(report.photoUrls)];
      if (isObjectKey(report.receiptUrl)) keys.push(report.receiptUrl);
      let ok = true;
      for (const key of keys) {
        try {
          await this.removeKey(key);
          await this.prisma.evidenceObject.updateMany({
            where: { objectKey: key },
            data: { status: 'DELETED', deletedAt: new Date() },
          });
        } catch {
          ok = false;
          await enqueueCleanup(this.prisma, key);
        }
      }
      if (ok) {
        await this.prisma.report.update({
          where: { id: report.id },
          data: { photoUrls: [], receiptUrl: '', evidencePurgeAfter: null },
        });
      }
    }
  }

  private async dropStaleStaged(): Promise<void> {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    const stale = await this.prisma.evidenceObject.findMany({
      where: { status: 'STAGED', reportId: null, createdAt: { lt: cutoff } },
      take: 20,
    });
    for (const row of stale) {
      try {
        if (isObjectKey(row.objectKey)) await this.removeKey(row.objectKey);
        await this.prisma.evidenceObject.update({
          where: { id: row.id },
          data: { status: 'DELETED', deletedAt: new Date() },
        });
      } catch {
        await enqueueCleanup(this.prisma, row.objectKey);
      }
    }
  }
}

function tickInterval(): number {
  const raw = Number(process.env.JOB_TICK_MS ?? 30_000);
  if (!Number.isInteger(raw) || raw < 500 || raw > 300_000) return 30_000;
  return raw;
}

function timeoutMs(): number {
  const raw = Number(process.env.DELETE_TIMEOUT_MS ?? 10_000);
  if (!Number.isInteger(raw) || raw < 500 || raw > 60_000) return 10_000;
  return raw;
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
