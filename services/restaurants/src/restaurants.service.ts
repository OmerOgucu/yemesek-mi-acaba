import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { AuthUser } from '@yemesek/auth';
import { BadgesService } from '@yemesek/badges';
import { PrismaService } from '@yemesek/database';
import { ModerationService } from '@yemesek/moderation';
import { SettingsService } from '@yemesek/settings';
import { levenshtein, placeKey } from '@yemesek/shared';
import { findOrCreateLocation } from './location';
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

  private async allowedCityKeys(): Promise<string[] | null> {
    const raw = await this.settings.get('allowedCities');
    const parts = raw
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (!parts.length) return null;
    return parts.map((part) => placeKey(part).key);
  }

  private async visibleReports(): Promise<Prisma.ReportWhereInput> {
    const reviewedOnly = await this.settings.reportsNeedReview();
    return {
      hidden: false,
      withdrawnAt: null,
      moderationStatus: reviewedOnly ? 'APPROVED' : { not: 'REJECTED' },
    };
  }

  async list(query: ListRestaurantsQuery): Promise<{
    items: RestaurantSummary[];
    total: number;
    cities: string[];
    locations: { city: string; districts: string[] }[];
  }> {
    const reportWhere = await this.visibleReports();
    const cityKey = query.city ? placeKey(query.city).key : undefined;
    const districtKey = query.district ? placeKey(query.district).key : undefined;
    const allowed = await this.allowedCityKeys();
    const restaurants = await this.prisma.restaurant.findMany({
      where: {
        hidden: false,
        ...(cityKey ? { cityKey } : {}),
        ...(districtKey
          ? { districtPlace: { key: districtKey, ...(cityKey ? { city: { key: cityKey } } : {}) } }
          : {}),
      },
      orderBy: { createdAt: 'asc' },
      include: { reports: { where: reportWhere, select: reportCountSelect } },
    });
    const locationRows = await this.prisma.city.findMany({
      where: { restaurants: { some: { hidden: false } } },
      orderBy: { name: 'asc' },
      include: {
        districts: {
          where: { restaurants: { some: { hidden: false } } },
          orderBy: { name: 'asc' },
        },
      },
    });
    const visibleRows = allowed ? restaurants.filter((row) => allowed.includes(row.cityKey)) : restaurants;
    const locations = locationRows
      .filter((city) => !allowed || allowed.includes(city.key))
      .filter((city) => city.districts.length > 0)
      .map((city) => ({ city: city.name, districts: city.districts.map((district) => district.name) }));
    const cities = locations.map((location) => location.city);
    const needle = query.q ? foldTr(query.q) : undefined;

    const items = visibleRows
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

    return { items, total: items.length, cities, locations };
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

    let location;
    try {
      location = await findOrCreateLocation(this.prisma, dto.city, dto.district);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Konum kaydedilemedi.');
    }
    const nameKey = placeKey(dto.name).key;
    const samePlace = await this.prisma.restaurant.findMany({
      where: { cityKey: location.cityKey, districtId: location.districtId, hidden: false },
      select: { id: true, name: true, nameKey: true },
    });
    const exact = samePlace.find((row) => row.nameKey === nameKey);
    const suggestions = samePlace
      .filter((row) => row.nameKey !== nameKey && levenshtein(row.nameKey, nameKey) <= 2 && nameKey.length > 4)
      .slice(0, 3)
      .map((row) => ({ id: row.id, name: row.name }));
    if (exact) {
      throw new ConflictException({
        message: 'Bu mekan bu ilçede zaten var.',
        existingId: exact.id,
        suggestions,
      });
    }
    const allowed = await this.allowedCityKeys();
    if (allowed && !allowed.includes(location.cityKey)) {
      throw new BadRequestException('Bu şehir henüz açık değil.');
    }
    const created = await this.prisma.restaurant.create({
      data: {
        name: dto.name,
        nameKey,
        brandName: dto.brandName || null,
        city: location.city,
        cityKey: location.cityKey,
        cityId: location.cityId,
        district: location.district,
        districtId: location.districtId,
        addressHint: dto.addressHint || null,
        cuisine: dto.cuisine || null,
        createdById: userId,
      },
      include: { reports: { select: reportCountSelect } },
    });
    await this.badges.sync(userId);
    return toSummary(created);
  }

  async claim(id: string, userId: string, note?: string) {
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant || restaurant.hidden) throw new NotFoundException('Mekan bulunamadı.');
    const existing = await this.prisma.restaurantClaim.findFirst({
      where: { restaurantId: id, userId, status: { in: ['PENDING', 'APPROVED'] } },
    });
    if (existing) return { id: existing.id, status: existing.status };
    const created = await this.prisma.restaurantClaim.create({
      data: { restaurantId: id, userId, note: note?.trim() || null },
    });
    return { id: created.id, status: created.status };
  }

  async venueReply(id: string, user: AuthUser, body: string) {
    const issues = this.moderation.collect([{ value: body }]);
    if (issues.length) throw new BadRequestException({ message: issues });
    const restaurant = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!restaurant || restaurant.hidden) throw new NotFoundException('Mekan bulunamadı.');
    const staff = user.role === 'ADMIN' || user.role === 'MODERATOR';
    const claim = await this.prisma.restaurantClaim.findFirst({
      where: { restaurantId: id, userId: user.id, status: 'APPROVED' },
    });
    if (!staff && !claim) throw new ForbiddenException('Bu mekana yanıt yazma yetkin yok.');
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: {
        venueReply: body.trim(),
        venueReplyAt: new Date(),
        venueReplyOnBehalf: staff && !claim,
      },
    });
    return {
      venueReply: updated.venueReply,
      venueReplyOnBehalf: updated.venueReplyOnBehalf,
    };
  }

  async findRow(id: string, reportWhere?: Prisma.ReportWhereInput): Promise<RestaurantRow> {
    if (!id || id.length > 40) throw new NotFoundException('Mekan bulunamadı.');
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        reports: {
          where: reportWhere,
          include: {
            _count: { select: { votes: true } },
            replies: { orderBy: { createdAt: 'asc' }, select: { body: true, onBehalf: true, createdAt: true } },
          },
        },
      },
    });
    if (!restaurant || restaurant.hidden) throw new NotFoundException('Mekan bulunamadı.');
    return restaurant;
  }
}
