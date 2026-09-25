import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BadgesService } from '@yemesek/badges';
import { PrismaService } from '@yemesek/database';
import { ModerationService } from '@yemesek/moderation';
import { SettingsService } from '@yemesek/settings';
import { normalizeCity } from '@yemesek/shared';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { ListRestaurantsQuery } from './dto/list-restaurants.query';
import {
  foldTr,
  toReportView,
  toSummary,
  type RestaurantRow,
  type RestaurantSummary,
} from './restaurant.mapper';

const reportCountSelect = {
  category: true,
  severity: true,
  _count: { select: { votes: true } },
} satisfies Prisma.ReportSelect;

@Injectable()
export class RestaurantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
    private readonly badges: BadgesService,
    private readonly settings: SettingsService,
  ) {}

  private async visibleReports(): Promise<Prisma.ReportWhereInput> {
    const reviewedOnly = await this.settings.reportsNeedReview();
    return {
      hidden: false,
      moderationStatus: reviewedOnly ? 'APPROVED' : { not: 'REJECTED' },
    };
  }

  async list(query: ListRestaurantsQuery): Promise<{
    items: RestaurantSummary[];
    total: number;
    cities: string[];
  }> {
    const reportWhere = await this.visibleReports();
    const restaurants = await this.prisma.restaurant.findMany({
      where: { hidden: false },
      orderBy: { createdAt: 'asc' },
      include: { reports: { where: reportWhere, select: reportCountSelect } },
    });
    const cityByKey = new Map<string, string>();
    for (const restaurant of restaurants) {
      if (!cityByKey.has(restaurant.cityKey)) cityByKey.set(restaurant.cityKey, restaurant.city);
    }
    const cities = [...cityByKey.values()].sort((a, b) => a.localeCompare(b, 'tr'));
    const needle = query.q ? foldTr(query.q) : undefined;
    const cityKey = query.city ? normalizeCity(query.city).cityKey : undefined;

    const items = restaurants
      .filter((restaurant) => {
        if (cityKey && restaurant.cityKey !== cityKey) return false;
        return true;
      })
      .map((restaurant) => toSummary(restaurant))
      .filter((restaurant) => {
        if (!needle) return true;
        const haystack = [restaurant.name, restaurant.city, restaurant.district, restaurant.cuisine]
          .filter(Boolean)
          .map((part) => foldTr(part as string))
          .join(' ');
        return haystack.includes(needle);
      })
      .sort(
        (a, b) =>
          b.evilScore - a.evilScore ||
          b.reportCount - a.reportCount ||
          a.name.localeCompare(b.name, 'tr'),
      );

    return { items, total: items.length, cities };
  }

  async detail(id: string) {
    const reportWhere = await this.visibleReports();
    const restaurant = await this.findRow(id, reportWhere);
    return {
      ...toSummary(restaurant),
      reports: restaurant.reports
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((report) => toReportView(report)),
    };
  }

  async create(dto: CreateRestaurantDto, userId: string): Promise<RestaurantSummary> {
    const issues = this.moderation.collect([
      { value: dto.name },
      { value: dto.city },
      { value: dto.district },
      { value: dto.addressHint, addressHint: true },
      { value: dto.cuisine },
    ]);
    if (issues.length) {
      throw new BadRequestException({ message: issues });
    }

    const normalized = normalizeCity(dto.city);
    if (normalized.city.length < 2) {
      throw new BadRequestException({ message: ['Şehir en az 2 karakter olmalı.'] });
    }
    const created = await this.prisma.restaurant.create({
      data: {
        name: dto.name,
        city: normalized.city,
        cityKey: normalized.cityKey,
        district: dto.district || null,
        addressHint: dto.addressHint || null,
        cuisine: dto.cuisine || null,
        createdById: userId,
      },
      include: { reports: { select: reportCountSelect } },
    });
    await this.badges.sync(userId);
    return toSummary(created);
  }

  async findRow(id: string, reportWhere?: Prisma.ReportWhereInput): Promise<RestaurantRow> {
    if (!id || id.length > 40) throw new NotFoundException('Mekan bulunamadı.');
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        reports: {
          where: reportWhere,
          include: { _count: { select: { votes: true } } },
        },
      },
    });
    if (!restaurant || restaurant.hidden) throw new NotFoundException('Mekan bulunamadı.');
    return restaurant;
  }
}
