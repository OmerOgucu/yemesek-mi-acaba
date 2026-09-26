import { Controller, Get, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, JwtAuthGuard, type AuthUser } from '@yemesek/auth';
import { PrismaService } from '@yemesek/database';
import { getObject, photoUrlList } from '@yemesek/evidence';
import { RestaurantsService } from '@yemesek/restaurants';

@Controller('media')
export class MediaController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly restaurants: RestaurantsService,
  ) {}

  @Get('photos/:reportId/:index')
  async photo(
    @Param('reportId') reportId: string,
    @Param('index') indexRaw: string,
    @Res() res: Response,
  ): Promise<void> {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: { restaurant: { select: { hidden: true, cityKey: true } } },
    });
    if (!report) throw new NotFoundException('Dosya bulunamadı.');
    const index = Number(indexRaw);
    const key = photoUrlList(report.photoUrls)[index];
    if (!key) throw new NotFoundException('Dosya bulunamadı.');
    const visible = await this.publicPhoto(report);
    if (!visible) throw new NotFoundException('Dosya bulunamadı.');
    const file = await getObject(key);
    if (!file) throw new NotFoundException('Dosya bulunamadı.');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.body);
  }

  @Get('receipts/:reportId')
  @UseGuards(JwtAuthGuard)
  async receipt(
    @CurrentUser() user: AuthUser,
    @Param('reportId') reportId: string,
    @Res() res: Response,
  ): Promise<void> {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    const key = report ? photoUrlList([report.receiptUrl])[0] : null;
    const staff = user.role === 'ADMIN' || user.role === 'MODERATOR';
    if (!report || !key || (report.authorId !== user.id && !staff)) {
      throw new NotFoundException('Dosya bulunamadı.');
    }
    const file = await getObject(key);
    if (!file) throw new NotFoundException('Dosya bulunamadı.');
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(file.body);
  }

  private async publicPhoto(report: {
    hidden: boolean;
    withdrawnAt: Date | null;
    moderationStatus: string;
    restaurant: { hidden: boolean; cityKey: string };
  }): Promise<boolean> {
    if (report.hidden || report.withdrawnAt || report.moderationStatus === 'REJECTED' || report.restaurant.hidden) {
      return false;
    }
    try {
      await this.restaurants.assertCityKeyListed(report.restaurant.cityKey);
      await this.restaurants.assertPublicReport(report.moderationStatus);
      return true;
    } catch {
      return false;
    }
  }
}
