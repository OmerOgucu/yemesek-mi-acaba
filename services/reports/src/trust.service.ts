import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@yemesek/auth';
import { PrismaService } from '@yemesek/database';
import { ModerationService } from '@yemesek/moderation';
import { placeKey } from '@yemesek/shared';

@Injectable()
export class TrustService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  async withdraw(reportId: string, userId: string) {
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report || report.authorId !== userId) throw new NotFoundException('Şikayet bulunamadı.');
    if (report.withdrawnAt) return { ok: true };
    await this.prisma.report.update({
      where: { id: reportId },
      data: { withdrawnAt: new Date(), hidden: true },
    });
    return { ok: true };
  }

  async flag(user: AuthUser, input: { reportId?: string; restaurantId?: string; reason: string }) {
    const issues = this.moderation.collect([{ value: input.reason }]);
    if (issues.length) throw new BadRequestException({ message: issues });
    if (!input.reportId && !input.restaurantId) throw new BadRequestException('Neyi bildirdiğin belli değil.');
    if (input.reportId) {
      const report = await this.prisma.report.findUnique({ where: { id: input.reportId } });
      if (!report) throw new NotFoundException('Şikayet bulunamadı.');
    }
    if (input.restaurantId) {
      const restaurant = await this.prisma.restaurant.findUnique({ where: { id: input.restaurantId } });
      if (!restaurant) throw new NotFoundException('Mekan bulunamadı.');
    }
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const recent = await this.prisma.contentFlag.count({ where: { userId: user.id, createdAt: { gt: since } } });
    if (process.env.NODE_ENV !== 'test' && recent >= 10) {
      throw new BadRequestException('Çok fazla bildirim. Bir saat sonra tekrar dene.');
    }
    await this.prisma.contentFlag.create({
      data: {
        userId: user.id,
        reportId: input.reportId,
        restaurantId: input.restaurantId,
        reason: input.reason.trim(),
      },
    });
    return { ok: true };
  }

  async appeal(reportId: string, user: AuthUser, body: string) {
    const issues = this.moderation.collect([{ value: body }]);
    if (issues.length) throw new BadRequestException({ message: issues });
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Şikayet bulunamadı.');
    if (!report.hidden && !report.withdrawnAt && report.moderationStatus !== 'REJECTED') {
      throw new BadRequestException('Yalnızca gizlenen kayda itiraz edilir.');
    }
    const claimed = await this.ownsVenue(user.id, report.restaurantId);
    if (report.authorId !== user.id && !claimed) throw new ForbiddenException('Bu kayda itiraz edemezsin.');
    await this.prisma.appeal.create({
      data: { reportId, userId: user.id, body: body.trim() },
    });
    return { ok: true };
  }

  async reply(reportId: string, user: AuthUser, body: string) {
    const issues = this.moderation.collect([{ value: body }]);
    if (issues.length) throw new BadRequestException({ message: issues });
    const report = await this.prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Şikayet bulunamadı.');
    await this.assertVenueCityOpen(report.restaurantId);
    const staff = user.role === 'ADMIN' || user.role === 'MODERATOR';
    const claimed = await this.ownsVenue(user.id, report.restaurantId);
    if (!staff && !claimed) throw new ForbiddenException('Bu mekana yanıt yazma yetkin yok.');
    const created = await this.prisma.reportReply.create({
      data: {
        reportId,
        authorId: user.id,
        body: body.trim(),
        onBehalf: staff && !claimed,
      },
    });
    return {
      id: created.id,
      body: created.body,
      onBehalf: created.onBehalf,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async block(blockerId: string, blockedId: string): Promise<{ ok: true }> {
    if (blockerId === blockedId) throw new BadRequestException('Kendini engelleyemezsin.');
    const user = await this.prisma.user.findUnique({ where: { id: blockedId } });
    if (!user || user.deletedAt) throw new NotFoundException('Üye bulunamadı.');
    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });
    return { ok: true };
  }

  private async assertVenueCityOpen(restaurantId: string): Promise<void> {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || restaurant.hidden) throw new NotFoundException('Mekan bulunamadı.');
    const setting = await this.prisma.siteSetting.findUnique({ where: { key: 'allowedCities' } });
    const keys = (setting?.value ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => placeKey(part).key);
    if (!keys.length) {
      if (process.env.NODE_ENV === 'production') throw new NotFoundException('Mekan bulunamadı.');
      return;
    }
    if (!keys.includes(restaurant.cityKey)) throw new NotFoundException('Mekan bulunamadı.');
  }

  private async ownsVenue(userId: string, restaurantId: string): Promise<boolean> {
    const claim = await this.prisma.restaurantClaim.findFirst({
      where: { userId, restaurantId, status: 'APPROVED' },
    });
    return Boolean(claim);
  }
}
