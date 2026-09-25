import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@yemesek/database';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
    return { status: 'ok' as const };
  }
}
