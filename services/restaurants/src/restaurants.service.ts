import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@yemesek/database';
import { ModerationService } from '@yemesek/moderation';
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
  ) {}

  async list(query: ListRestaurantsQuery): Promise<{
    items: RestaurantSummary[];
    total: number;
    cities: string[];
  }> {
    const restaurants = await this.prisma.restaurant.findMany({
      include: { reports: { select: reportCountSelect } },
    });
    const cities = [...new Set(restaurants.map((restaurant) => restaurant.city))].sort((a, b) =>
      a.localeCompare(b, 'tr'),
    );
    const needle = query.q ? foldTr(query.q) : undefined;
    const city = query.city ? foldTr(query.city) : undefined;

    const items = restaurants
      .map((restaurant) => toSummary(restaurant))
      .filter((restaurant) => {
        if (city && foldTr(restaurant.city) !== city) return false;
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
    const restaurant = await this.findRow(id);
    return {
      ...toSummary(restaurant),
      reports: restaurant.reports
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((report) => toReportView(report)),
    };
  }

  async create(dto: CreateRestaurantDto): Promise<RestaurantSummary> {
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

    const created = await this.prisma.restaurant.create({
      data: {
        name: dto.name,
        city: dto.city,
        district: dto.district || null,
        addressHint: dto.addressHint || null,
        cuisine: dto.cuisine || null,
      },
      include: { reports: { select: reportCountSelect } },
    });
    return toSummary(created);
  }

  async findRow(id: string): Promise<RestaurantRow> {
    if (!id || id.length > 40) throw new NotFoundException('Mekan bulunamadı.');
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        reports: {
          include: { _count: { select: { votes: true } } },
        },
      },
    });
    if (!restaurant) throw new NotFoundException('Mekan bulunamadı.');
    return restaurant;
  }
}
