import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ModerationStatus, Prisma, UserRole } from '@prisma/client';
import { BadgesService } from '@yemesek/badges';
import { readConfig } from '@yemesek/config';
import { PrismaService } from '@yemesek/database';
import { EvidenceService } from '@yemesek/evidence';
import { TEMPLATE_DEFAULTS, TEMPLATE_KEYS, isTemplateKey, MailService } from '@yemesek/mail';
import { ModerationService } from '@yemesek/moderation';
import { SettingsService } from '@yemesek/settings';
import { findOrCreateLocation } from '@yemesek/restaurants';
import { contributionScore, placeKey } from '@yemesek/shared';
import { GrantBadgeDto, UpdateRestaurantDto, UpdateTemplateDto, UpdateUserDto, UpsertBadgeDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly badges: BadgesService,
    private readonly settings: SettingsService,
    private readonly mail: MailService,
    private readonly moderation: ModerationService,
    private readonly evidence: EvidenceService,
  ) {}

  async dashboard() {
    const [members, restaurants, reports, recentUsers, recentRestaurants, recentReports] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.restaurant.count(),
      this.prisma.report.count(),
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, displayName: true, createdAt: true },
      }),
      this.prisma.restaurant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, name: true, city: true, createdAt: true },
      }),
      this.prisma.report.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, createdAt: true },
      }),
    ]);
    const recent = [
      ...recentUsers.map((item) => ({
        type: 'user' as const,
        id: item.id,
        label: item.displayName,
        createdAt: item.createdAt.toISOString(),
      })),
      ...recentRestaurants.map((item) => ({
        type: 'restaurant' as const,
        id: item.id,
        label: `${item.name} · ${item.city}`,
        createdAt: item.createdAt.toISOString(),
      })),
      ...recentReports.map((item) => ({
        type: 'report' as const,
        id: item.id,
        label: item.title,
        createdAt: item.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);
    return { members, restaurants, reports, recent };
  }

  async users(q?: string) {
    const needle = q?.trim();
    const rows = await this.prisma.user.findMany({
      where: needle
        ? { OR: [{ email: { contains: needle } }, { displayName: { contains: needle } }] }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        badges: { where: { revokedAt: null }, include: { badge: true } },
      },
    });
    return Promise.all(
      rows.map(async (user) => {
        const counts = await this.badges.counts(user.id);
        return {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          emailVerified: Boolean(user.emailVerifiedAt),
          disabled: Boolean(user.disabledAt),
          createdAt: user.createdAt.toISOString(),
          contribution: { ...counts, score: contributionScore(counts) },
          badges: user.badges.map((award) => ({
            id: award.badgeId,
            slug: award.badge.slug,
            name: award.badge.name,
            icon: award.badge.icon,
            source: award.source,
          })),
        };
      }),
    );
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Üye bulunamadı.');
    const nextRole = dto.role ?? user.role;
    const nextDisabled = dto.disabled ?? Boolean(user.disabledAt);
    if (user.role === UserRole.ADMIN && (nextRole !== UserRole.ADMIN || nextDisabled)) {
      const others = await this.prisma.user.count({
        where: { role: UserRole.ADMIN, disabledAt: null, id: { not: id } },
      });
      if (others === 0) {
        throw new BadRequestException('Son yöneticiyi düşüremez veya askıya alamazsın.');
      }
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        role: nextRole,
        disabledAt: nextDisabled ? user.disabledAt ?? new Date() : null,
      },
    });
    if (nextDisabled) {
      await this.prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { id: updated.id, role: updated.role, disabled: Boolean(updated.disabledAt) };
  }

  async restaurants() {
    const rows = await this.prisma.restaurant.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { _count: { select: { reports: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city,
      district: row.district,
      cuisine: row.cuisine,
      hidden: row.hidden,
      reportCount: row._count.reports,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async updateRestaurant(id: string, dto: UpdateRestaurantDto) {
    const current = await this.prisma.restaurant.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Mekan bulunamadı.');
    const issues = this.moderation.collect([
      { value: dto.name },
      { value: dto.city },
      { value: dto.district },
      { value: dto.addressHint, addressHint: true },
      { value: dto.cuisine },
    ]);
    if (issues.length) throw new BadRequestException({ message: issues });
    const nextCity = dto.city ?? current.city;
    const nextDistrict = dto.district !== undefined ? dto.district : current.district;
    if (!nextDistrict || !nextDistrict.trim()) {
      throw new BadRequestException('İlçe zorunlu.');
    }
    let location;
    try {
      location = await findOrCreateLocation(this.prisma, nextCity, nextDistrict);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Konum kaydedilemedi.');
    }
    const updated = await this.prisma.restaurant.update({
      where: { id },
      data: {
        name: dto.name ?? current.name,
        city: location.city,
        cityKey: location.cityKey,
        cityId: location.cityId,
        district: location.district,
        districtId: location.districtId,
        cuisine: dto.cuisine !== undefined ? dto.cuisine || null : current.cuisine,
        addressHint: dto.addressHint !== undefined ? dto.addressHint || null : current.addressHint,
        hidden: dto.hidden ?? current.hidden,
      },
    });
    if (updated.createdById) await this.badges.sync(updated.createdById);
    return { id: updated.id, hidden: updated.hidden, city: updated.city };
  }

  async deleteRestaurant(id: string) {
    const current = await this.prisma.restaurant.findUnique({
      where: { id },
      include: { reports: { select: { photoUrls: true, receiptUrl: true, authorId: true } } },
    });
    if (!current) throw new NotFoundException('Mekan bulunamadı.');
    await this.prisma.restaurant.delete({ where: { id } });
    for (const report of current.reports) this.unlinkReport(report.photoUrls, report.receiptUrl);
    const authors = new Set(current.reports.map((report) => report.authorId));
    if (current.createdById) authors.add(current.createdById);
    for (const authorId of authors) await this.badges.sync(authorId);
    return { ok: true };
  }

  async reports(status?: ModerationStatus) {
    const rows = await this.prisma.report.findMany({
      where: status ? { moderationStatus: status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { restaurant: { select: { id: true, name: true, city: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.category,
      severity: row.severity,
      moderationStatus: row.moderationStatus,
      hidden: row.hidden,
      evidenceVerified: row.evidenceVerified,
      moderationNote: row.moderationNote,
      createdAt: row.createdAt.toISOString(),
      restaurant: row.restaurant,
    }));
  }

  async moderate(id: string, input: { status?: ModerationStatus; hidden?: boolean; note?: string }) {
    const current = await this.prisma.report.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Şikayet bulunamadı.');
    const data: Prisma.ReportUpdateInput = {};
    if (input.note !== undefined) data.moderationNote = input.note || null;
    if (input.hidden !== undefined) data.hidden = input.hidden;
    if (input.status === ModerationStatus.APPROVED) {
      data.moderationStatus = ModerationStatus.APPROVED;
      data.evidenceVerified = true;
      if (input.hidden === undefined) data.hidden = false;
    } else if (input.status === ModerationStatus.REJECTED) {
      data.moderationStatus = ModerationStatus.REJECTED;
      data.evidenceVerified = false;
      data.hidden = true;
    } else if (input.status === ModerationStatus.PENDING) {
      data.moderationStatus = ModerationStatus.PENDING;
      data.evidenceVerified = false;
    }
    const updated = await this.prisma.report.update({ where: { id }, data });
    await this.badges.sync(updated.authorId);
    return {
      id: updated.id,
      moderationStatus: updated.moderationStatus,
      hidden: updated.hidden,
      evidenceVerified: updated.evidenceVerified,
    };
  }

  async deleteReport(id: string) {
    const current = await this.prisma.report.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Şikayet bulunamadı.');
    await this.prisma.report.delete({ where: { id } });
    this.unlinkReport(current.photoUrls, current.receiptUrl);
    await this.badges.sync(current.authorId);
    return { ok: true };
  }

  async listBadges() {
    const rows = await this.prisma.badge.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      icon: row.icon,
      metric: row.metric,
      threshold: row.threshold,
      sortOrder: row.sortOrder,
      enabled: row.enabled,
    }));
  }

  async createBadge(dto: UpsertBadgeDto) {
    try {
      const created = await this.prisma.badge.create({ data: dto });
      await this.recomputeAll();
      return { id: created.id };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Bu rozet kodu kullanılıyor.');
      }
      throw error;
    }
  }

  async updateBadge(id: string, dto: UpsertBadgeDto) {
    const current = await this.prisma.badge.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Rozet bulunamadı.');
    try {
      await this.prisma.badge.update({ where: { id }, data: dto });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Bu rozet kodu kullanılıyor.');
      }
      throw error;
    }
    await this.recomputeAll();
    return { id };
  }

  async deleteBadge(id: string) {
    const current = await this.prisma.badge.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Rozet bulunamadı.');
    await this.prisma.badge.delete({ where: { id } });
    return { ok: true };
  }

  async grantBadge(userId: string, dto: GrantBadgeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Üye bulunamadı.');
    const badge = await this.prisma.badge.findUnique({ where: { id: dto.badgeId } });
    if (!badge) throw new NotFoundException('Rozet bulunamadı.');
    await this.prisma.userBadge.upsert({
      where: { userId_badgeId: { userId, badgeId: badge.id } },
      update: { source: 'MANUAL', revokedAt: null, awardedAt: new Date() },
      create: { userId, badgeId: badge.id, source: 'MANUAL' },
    });
    return { ok: true };
  }

  async revokeBadge(userId: string, badgeId: string) {
    const row = await this.prisma.userBadge.findUnique({ where: { userId_badgeId: { userId, badgeId } } });
    if (!row) throw new NotFoundException('Rozet kaydı yok.');
    await this.prisma.userBadge.update({
      where: { id: row.id },
      data: { source: 'MANUAL', revokedAt: new Date() },
    });
    return { ok: true };
  }

  async recompute(userId?: string) {
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('Üye bulunamadı.');
      await this.badges.sync(userId);
      return { ok: true };
    }
    await this.recomputeAll();
    return { ok: true };
  }

  templates() {
    return Promise.all(
      TEMPLATE_KEYS.map(async (key) => {
        const stored = await this.prisma.emailTemplate.findUnique({ where: { key } });
        const fallback = TEMPLATE_DEFAULTS[key];
        return {
          key,
          subject: stored?.subject ?? fallback.subject,
          htmlBody: stored?.htmlBody ?? fallback.htmlBody,
          textBody: stored?.textBody ?? fallback.textBody,
          customized: Boolean(stored),
        };
      }),
    );
  }

  async saveTemplate(key: string, dto: UpdateTemplateDto) {
    if (!isTemplateKey(key)) throw new NotFoundException('Şablon yok.');
    await this.prisma.emailTemplate.upsert({
      where: { key },
      update: dto,
      create: { key, ...dto },
    });
    return { key };
  }

  async previewTemplate(key: string, sample?: { displayName?: string; code?: string; verifyUrl?: string }) {
    if (!isTemplateKey(key)) throw new NotFoundException('Şablon yok.');
    const config = readConfig();
    return this.mail.render(key, {
      displayName: sample?.displayName || 'Ada',
      code: sample?.code || '123456',
      verifyUrl: sample?.verifyUrl || `${config.appPublicUrl}/dogrula?token=ornek`,
    });
  }

  listSettings() {
    return this.settings.publicList();
  }

  async locations() {
    const cities = await this.prisma.city.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { restaurants: true } },
        districts: {
          orderBy: { name: 'asc' },
          include: { _count: { select: { restaurants: true } } },
        },
      },
    });
    return cities.map((city) => ({
      id: city.id,
      name: city.name,
      venueCount: city._count.restaurants,
      districts: city.districts.map((district) => ({
        id: district.id,
        name: district.name,
        venueCount: district._count.restaurants,
      })),
    }));
  }

  async renameCity(id: string, name: string) {
    const current = await this.prisma.city.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Şehir bulunamadı.');
    const next = placeKey(name);
    if (next.name.length < 2) throw new BadRequestException('Şehir en az 2 karakter olmalı.');
    const clash = await this.prisma.city.findUnique({ where: { key: next.key } });
    if (clash && clash.id !== id) {
      throw new BadRequestException('Bu şehir zaten var. Konumlar ekranından birleştir.');
    }
    await this.prisma.city.update({ where: { id }, data: { name: next.name, key: next.key } });
    await this.prisma.restaurant.updateMany({
      where: { cityId: id },
      data: { city: next.name, cityKey: next.key },
    });
    return { id, name: next.name };
  }

  async renameDistrict(id: string, name: string) {
    const current = await this.prisma.district.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('İlçe bulunamadı.');
    const next = placeKey(name);
    if (next.name.length < 2) throw new BadRequestException('İlçe en az 2 karakter olmalı.');
    const clash = await this.prisma.district.findUnique({
      where: { cityId_key: { cityId: current.cityId, key: next.key } },
    });
    if (clash && clash.id !== id) {
      throw new BadRequestException('Bu ilçe bu şehirde zaten var.');
    }
    await this.prisma.district.update({ where: { id }, data: { name: next.name, key: next.key } });
    await this.prisma.restaurant.updateMany({
      where: { districtId: id },
      data: { district: next.name },
    });
    return { id, name: next.name };
  }

  async mergeCities(sourceId: string, intoCityId: string) {
    if (sourceId === intoCityId) throw new BadRequestException('Şehir kendisiyle birleştirilemez.');
    const source = await this.prisma.city.findUnique({ where: { id: sourceId }, include: { districts: true } });
    const target = await this.prisma.city.findUnique({ where: { id: intoCityId }, include: { districts: true } });
    if (!source || !target) throw new NotFoundException('Şehir bulunamadı.');
    for (const district of source.districts) {
      const existing = target.districts.find((item) => item.key === district.key);
      if (existing) {
        await this.prisma.restaurant.updateMany({
          where: { districtId: district.id },
          data: {
            cityId: target.id,
            city: target.name,
            cityKey: target.key,
            districtId: existing.id,
            district: existing.name,
          },
        });
        await this.prisma.district.delete({ where: { id: district.id } });
      } else {
        await this.prisma.district.update({ where: { id: district.id }, data: { cityId: target.id } });
        await this.prisma.restaurant.updateMany({
          where: { districtId: district.id },
          data: { cityId: target.id, city: target.name, cityKey: target.key },
        });
      }
    }
    await this.prisma.restaurant.updateMany({
      where: { cityId: source.id },
      data: { cityId: target.id, city: target.name, cityKey: target.key },
    });
    await this.prisma.city.delete({ where: { id: source.id } });
    return { ok: true, intoCityId: target.id };
  }

  setSetting(key: string, value: string) {
    return this.settings.set(key, value);
  }

  private async recomputeAll(): Promise<void> {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    for (const user of users) await this.badges.sync(user.id);
  }

  private unlinkReport(photoUrls: unknown, receiptUrl: string): void {
    for (const url of this.evidence.photoUrls(photoUrls)) this.evidence.remove(url);
    const receipt = this.evidence.publicPath(receiptUrl);
    if (receipt) this.evidence.remove(receipt);
  }
}
