import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { assertHuman } from '@yemesek/auth';
import { BadgesService } from '@yemesek/badges';
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
    private readonly badges: BadgesService,
  ) {}

  async create(
    restaurantId: string,
    dto: CreateReportDto,
    author: { id: string; displayName: string },
    files: { photos?: IncomingImage[]; receipt?: IncomingImage[] },
  ): Promise<ReportView> {
    await assertHuman(dto);
    await this.restaurants.findRow(restaurantId);
    const issues = this.moderation.collect([
      { value: dto.title },
      { value: dto.body },
      { value: dto.nickname },
    ]);
    if (issues.length) {
      throw new BadRequestException({ message: issues });
    }

    const evidence = await this.evidence.assert(files.photos, files.receipt);
    const review = this.moderation.stampEvidence();
    let created;
    try {
      created = await this.prisma.report.create({
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
    } catch (error) {
      for (const url of [...evidence.photoUrls, evidence.receiptUrl]) this.evidence.remove(url);
      throw error;
    }
    await this.badges.sync(author.id);
    return toReportView(created);
  }

  async findOrThrow(id: string) {
    if (!id || id.length > 40) throw new NotFoundException('Şikayet bulunamadı.');
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report || report.hidden || report.moderationStatus === 'REJECTED') {
      throw new NotFoundException('Şikayet bulunamadı.');
    }
    return report;
  }
}
