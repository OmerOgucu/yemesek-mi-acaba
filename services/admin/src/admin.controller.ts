import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '@yemesek/auth';
import { AdminService } from './admin.service';
import {
  AdminReportQuery,
  AdminUserQuery,
  GrantBadgeDto,
  MergeCityDto,
  ModerateReportDto,
  RenameLocationDto,
  PreviewTemplateDto,
  UpdateRestaurantDto,
  UpdateSettingDto,
  UpdateTemplateDto,
  UpdateUserDto,
  UpsertBadgeDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  users(@Query() query: AdminUserQuery) {
    return this.admin.users(query.q);
  }

  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.admin.updateUser(id, dto);
  }

  @Post('users/:id/badges')
  grant(@Param('id') id: string, @Body() dto: GrantBadgeDto) {
    return this.admin.grantBadge(id, dto);
  }

  @Delete('users/:id/badges/:badgeId')
  revoke(@Param('id') id: string, @Param('badgeId') badgeId: string) {
    return this.admin.revokeBadge(id, badgeId);
  }

  @Get('restaurants')
  restaurants() {
    return this.admin.restaurants();
  }

  @Patch('restaurants/:id')
  updateRestaurant(@Param('id') id: string, @Body() dto: UpdateRestaurantDto) {
    return this.admin.updateRestaurant(id, dto);
  }

  @Delete('restaurants/:id')
  deleteRestaurant(@Param('id') id: string) {
    return this.admin.deleteRestaurant(id);
  }

  @Get('reports')
  reports(@Query() query: AdminReportQuery) {
    return this.admin.reports(query.status);
  }

  @Patch('reports/:id')
  moderate(@Param('id') id: string, @Body() dto: ModerateReportDto) {
    return this.admin.moderate(id, dto);
  }

  @Delete('reports/:id')
  deleteReport(@Param('id') id: string) {
    return this.admin.deleteReport(id);
  }

  @Get('badges')
  badges() {
    return this.admin.listBadges();
  }

  @Post('badges')
  createBadge(@Body() dto: UpsertBadgeDto) {
    return this.admin.createBadge(dto);
  }

  @Patch('badges/:id')
  updateBadge(@Param('id') id: string, @Body() dto: UpsertBadgeDto) {
    return this.admin.updateBadge(id, dto);
  }

  @Delete('badges/:id')
  deleteBadge(@Param('id') id: string) {
    return this.admin.deleteBadge(id);
  }

  @Post('badges/recompute')
  recompute(@Body() body: { userId?: string }) {
    return this.admin.recompute(body?.userId);
  }

  @Get('email-templates')
  templates() {
    return this.admin.templates();
  }

  @Put('email-templates/:key')
  saveTemplate(@Param('key') key: string, @Body() dto: UpdateTemplateDto) {
    return this.admin.saveTemplate(key, dto);
  }

  @Post('email-templates/:key/preview')
  preview(@Param('key') key: string, @Body() dto: PreviewTemplateDto) {
    return this.admin.previewTemplate(key, dto);
  }

  @Get('locations')
  locations() {
    return this.admin.locations();
  }

  @Patch('locations/cities/:id')
  renameCity(@Param('id') id: string, @Body() dto: RenameLocationDto) {
    return this.admin.renameCity(id, dto.name);
  }

  @Post('locations/cities/:id/merge')
  mergeCity(@Param('id') id: string, @Body() dto: MergeCityDto) {
    return this.admin.mergeCities(id, dto.intoCityId);
  }

  @Patch('locations/districts/:id')
  renameDistrict(@Param('id') id: string, @Body() dto: RenameLocationDto) {
    return this.admin.renameDistrict(id, dto.name);
  }

  @Get('settings')
  settings() {
    return this.admin.listSettings();
  }

  @Put('settings/:key')
  setSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.admin.setSetting(key, dto.value);
  }
}
