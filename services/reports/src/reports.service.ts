import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { assertHuman } from '@yemesek/auth';
import { BadgesService } from '@yemesek/badges';
import { consumeBucket, PrismaService } from '@yemesek/database';
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

    const uploadAllowed = await consumeBucket(this.prisma, `upload:user:${author.id}`, 30, 60 * 60 * 1000);
    if (!uploadAllowed) {
      throw new HttpException('Saatlik yükleme hakkın doldu. Bir saat sonra tekrar dene.', HttpStatus.TOO_MANY_REQUESTS);
    }
    const evidence = await this.evidence.assert(files.photos, files.receipt);
    await this.prisma.evidenceObject.createMany({
      data: evidence.objects.map((item) => ({
        objectKey: item.key,
        kind: item.kind,
        contentType: item.contentType,
        byteSize: item.byteSize,
        ownerId: author.id,
        status: 'STAGED',
      })),
    });
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
      await this.prisma.evidenceObject.updateMany({
        where: { objectKey: { in: evidence.objects.map((item) => item.key) } },
        data: { reportId: created.id, status: 'ATTACHED' },
      });
    } catch (error) {
      for (const item of evidence.objects) {
        const removed = await this.evidence.remove(item.key);
        if (!removed) {
          await this.prisma.cleanupJob.create({ data: { objectKey: item.key } });
        } else {
          await this.prisma.evidenceObject.updateMany({
            where: { objectKey: item.key },
            data: { status: 'DELETED', deletedAt: new Date() },
          });
        }
      }
      throw error;
    }
    await this.badges.sync(author.id);
    return toReportView(created);
  }

  async findOrThrow(id: string) {
    if (!id || id.length > 40) throw new NotFoundException('Şikayet bulunamadı.');
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { restaurant: { select: { cityKey: true, hidden: true } } },
    });
    if (!report || report.hidden || report.withdrawnAt || report.moderationStatus === 'REJECTED' || report.restaurant.hidden) {
      throw new NotFoundException('Şikayet bulunamadı.');
    }
    await this.restaurants.assertCityKeyListed(report.restaurant.cityKey);
    await this.restaurants.assertPublicReport(report.moderationStatus);
    return report;
  }
}
