import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { collectPolicyIssues } from '../moderation/content-policy';
import { PrismaService } from '../prisma/prisma.service';
import { toReportView, type ReportView } from '../restaurants/restaurant.mapper';
import { RestaurantsService } from '../restaurants/restaurants.service';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurants: RestaurantsService,
  ) {}

  async create(restaurantId: string, dto: CreateReportDto): Promise<ReportView> {
    await this.restaurants.findRow(restaurantId);
    const issues = collectPolicyIssues([
      { value: dto.title },
      { value: dto.body },
      { value: dto.nickname },
    ]);
    if (issues.length) {
      throw new BadRequestException({ message: issues });
    }

    const created = await this.prisma.report.create({
      data: {
        restaurantId,
        category: dto.category,
        severity: dto.severity,
        title: dto.title,
        body: dto.body,
        nickname: dto.nickname || 'anonim',
      },
      include: { _count: { select: { votes: true } } },
    });
    return toReportView(created);
  }

  async findOrThrow(id: string) {
    if (!id || id.length > 40) throw new NotFoundException('Şikayet bulunamadı.');
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Şikayet bulunamadı.');
    return report;
  }
}
