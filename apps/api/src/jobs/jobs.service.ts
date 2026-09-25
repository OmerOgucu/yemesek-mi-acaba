import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@yemesek/database';
import { deleteObject, isObjectKey, photoUrlList } from '@yemesek/evidence';
import { MailService } from '@yemesek/mail';

const TICK_MS = 30_000;

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  onModuleInit(): void {
    if (process.env.NODE_ENV === 'test' || process.env.RUN_WORKER === 'false') return;
    this.timer = setInterval(() => {
      void this.tick();
    }, TICK_MS);
    this.timer.unref?.();
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.mail.processDue(10);
      await this.cleanupObjects();
      await this.purgeDueEvidence();
      await this.dropStaleStaged();
    } catch (error) {
      const message = error instanceof Error ? error.name : 'job';
      console.error(`[jobs] ${message}`);
    } finally {
      this.running = false;
    }
  }

  private async cleanupObjects(): Promise<void> {
    const now = new Date();
    const jobs = await this.prisma.cleanupJob.findMany({
      where: { status: 'PENDING', nextAttemptAt: { lte: now }, attempts: { lt: 8 } },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });
    for (const job of jobs) {
      const lease = await this.prisma.cleanupJob.updateMany({
        where: { id: job.id, status: 'PENDING' },
        data: { status: 'RUNNING', attempts: { increment: 1 } },
      });
      if (lease.count !== 1) continue;
      try {
        if (!isObjectKey(job.objectKey)) throw new Error('bad key');
        await deleteObject(job.objectKey);
        await this.prisma.cleanupJob.update({
          where: { id: job.id },
          data: { status: 'DONE', lastError: null },
        });
        await this.prisma.evidenceObject.updateMany({
          where: { objectKey: job.objectKey },
          data: { status: 'DELETED', deletedAt: new Date() },
        });
      } catch {
        const attempts = job.attempts + 1;
        await this.prisma.cleanupJob.update({
          where: { id: job.id },
          data: {
            status: attempts >= 8 ? 'FAILED' : 'PENDING',
            nextAttemptAt: new Date(Date.now() + Math.min(60_000 * 2 ** attempts, 30 * 60_000)),
            lastError: 'delete failed',
          },
        });
      }
    }
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
          await deleteObject(key);
          await this.prisma.evidenceObject.updateMany({
            where: { objectKey: key },
            data: { status: 'DELETED', deletedAt: new Date() },
          });
        } catch {
          ok = false;
          await this.prisma.cleanupJob.create({ data: { objectKey: key } });
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
        if (isObjectKey(row.objectKey)) await deleteObject(row.objectKey);
        await this.prisma.evidenceObject.update({
          where: { id: row.id },
          data: { status: 'DELETED', deletedAt: new Date() },
        });
      } catch {
        await this.prisma.cleanupJob.create({ data: { objectKey: row.objectKey } });
      }
    }
  }
}
