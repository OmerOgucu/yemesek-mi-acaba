import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@yemesek/database';
import { JobsService } from '../jobs/jobs.service';

@Controller()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
  ) {}

  @Get('health')
  health() {
    return {
      status: 'ok' as const,
      uptime: Math.round(process.uptime()),
    };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({ status: 'unavailable' });
    }
    if (!this.jobs.heartbeatOk()) {
      throw new ServiceUnavailableException({ status: 'unavailable' });
    }
    const role = process.env.RUN_WORKER === 'true' ? 'worker' : 'api';
    return { status: 'ok' as const, role };
  }
}
