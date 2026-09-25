import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@yemesek/database';
import { EvidenceService, type IncomingImage } from '@yemesek/evidence';
import { ModerationService } from '@yemesek/moderation';
import { RestaurantsService, toReportView, type ReportView } from '@yemesek/restaurants';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurants: RestaurantsService,
    private readonly moderation: ModerationService,
    private readonly evidence: EvidenceService,
  ) {}

  async create(
    restaurantId: string,
    dto: CreateReportDto,
    author: { id: string; displayName: string },
    files: { photos?: IncomingImage[]; receipt?: IncomingImage[] },
  ): Promise<ReportView> {
    await this.restaurants.findRow(restaurantId);
    const issues = this.moderation.collect([
      { value: dto.title },
      { value: dto.body },
      { value: dto.nickname },
    ]);
    if (issues.length) {
      throw new BadRequestException({ message: issues });
    }

    const evidence = this.evidence.assert(files.photos, files.receipt);
    const review = this.moderation.stampEvidence();
    try {
      const created = await this.prisma.report.create({
        data: {
          restaurantId,
          authorId: author.id,
          category: dto.category,
          severity: dto.severity,
          title: dto.title,
          body: dto.body,
          nickname: dto.nickname || author.displayName,
          photoUrls: evidence.photoUrls,
          receiptUrl: evidence.receiptUrl,
          evidenceVerified: review.evidenceVerified,
        },
        include: { _count: { select: { votes: true } } },
      });
      return toReportView(created);
    } catch (error) {
      for (const url of [...evidence.photoUrls, evidence.receiptUrl]) this.evidence.remove(url);
      throw error;
    }
  }

  async findOrThrow(id: string) {
    if (!id || id.length > 40) throw new NotFoundException('Şikayet bulunamadı.');
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Şikayet bulunamadı.');
    return report;
  }
}
