import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard, type AuthUser } from '@yemesek/auth';
import { AdminMfaGuard } from './admin-mfa.guard';
import { AuditInterceptor } from './audit.interceptor';
import { AdminService } from './admin.service';
import {
  AdminReportQuery,
  AdminUserQuery,
  GrantBadgeDto,
  DestructiveConfirmDto,
  MergeCityDto,
  ModerateReportDto,
  ThreatReportDto,
  RenameLocationDto,
  ResolveAppealDto,
  ReviewClaimDto,
  SaveContentDto,
  PreviewTemplateDto,
  UpdateRestaurantDto,
  UpdateSettingDto,
  UpdateTemplateDto,
  UpdateUserDto,
  UpsertBadgeDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminMfaGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
@UseInterceptors(AuditInterceptor)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  @Roles(UserRole.ADMIN)
  users(@Query() query: AdminUserQuery) {
    return this.admin.users(query.q);
  }

  @Patch('users/:id')
  @Roles(UserRole.ADMIN)
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.admin.updateUser(id, dto);
  }

  @Post('users/:id/logout')
  @Roles(UserRole.ADMIN)
  forceLogout(@Param('id') id: string) {
    return this.admin.forceLogout(id);
  }

  @Post('users/:id/badges')
  @Roles(UserRole.ADMIN)
  grant(@Param('id') id: string, @Body() dto: GrantBadgeDto) {
    return this.admin.grantBadge(id, dto);
  }

  @Delete('users/:id/badges/:badgeId')
  @Roles(UserRole.ADMIN)
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
  @Roles(UserRole.ADMIN)
  deleteRestaurant(@Param('id') id: string) {
    return this.admin.deleteRestaurant(id);
  }

  @Get('reports/meta')
  reportMeta() {
    return this.admin.reportMeta();
  }

  @Get('reports')
  reports(@Query() query: AdminReportQuery) {
    return this.admin.reports(query.status);
  }

  @Post('reports/:id/threat')
  threat(@Param('id') id: string, @Body() dto: ThreatReportDto) {
    return this.admin.markThreat(id, dto.threat);
  }

  @Patch('reports/:id')
  moderate(@Param('id') id: string, @Body() dto: ModerateReportDto) {
    return this.admin.moderate(id, dto);
  }

  @Delete('reports/:id')
  @Roles(UserRole.ADMIN)
  deleteReport(@Param('id') id: string) {
    return this.admin.deleteReport(id);
  }

  @Get('badges')
  @Roles(UserRole.ADMIN)
  badges() {
    return this.admin.listBadges();
  }

  @Post('badges')
  @Roles(UserRole.ADMIN)
  createBadge(@Body() dto: UpsertBadgeDto) {
    return this.admin.createBadge(dto);
  }

  @Patch('badges/:id')
  @Roles(UserRole.ADMIN)
  updateBadge(@Param('id') id: string, @Body() dto: UpsertBadgeDto) {
    return this.admin.updateBadge(id, dto);
  }

  @Delete('badges/:id')
  @Roles(UserRole.ADMIN)
  deleteBadge(@Param('id') id: string) {
    return this.admin.deleteBadge(id);
  }

  @Post('badges/recompute')
  @Roles(UserRole.ADMIN)
  recompute(@Body() body: { userId?: string }) {
    return this.admin.recompute(body?.userId);
  }

  @Get('email-templates')
  @Roles(UserRole.ADMIN)
  templates() {
    return this.admin.templates();
  }

  @Put('email-templates/:key')
  @Roles(UserRole.ADMIN)
  saveTemplate(@Param('key') key: string, @Body() dto: UpdateTemplateDto) {
    return this.admin.saveTemplate(key, dto);
  }

  @Post('email-templates/:key/preview')
  @Roles(UserRole.ADMIN)
  preview(@Param('key') key: string, @Body() dto: PreviewTemplateDto) {
    return this.admin.previewTemplate(key, dto);
  }

  @Get('locations')
  locations() {
    return this.admin.locations();
  }

  @Patch('locations/cities/:id')
  @Roles(UserRole.ADMIN)
  renameCity(@Param('id') id: string, @Body() dto: RenameLocationDto) {
    return this.admin.renameCity(id, dto.name);
  }

  @Post('locations/cities/:id/merge')
  @Roles(UserRole.ADMIN)
  mergeCity(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: MergeCityDto) {
    return this.admin.mergeCities(id, dto.intoCityId, user.id, dto.password, dto.confirm);
  }

  @Post('users/:id/delete')
  @Roles(UserRole.ADMIN)
  deleteUser(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: DestructiveConfirmDto) {
    return this.admin.deleteUser(user.id, id, dto.password, dto.confirm);
  }

  @Patch('locations/districts/:id')
  @Roles(UserRole.ADMIN)
  renameDistrict(@Param('id') id: string, @Body() dto: RenameLocationDto) {
    return this.admin.renameDistrict(id, dto.name);
  }

  @Get('settings')
  @Roles(UserRole.ADMIN)
  settings() {
    return this.admin.listSettings();
  }

  @Put('settings/:key')
  @Roles(UserRole.ADMIN)
  setSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.admin.setSetting(key, dto.value);
  }

  @Get('analytics')
  @Roles(UserRole.ADMIN)
  analytics() {
    return this.admin.analytics();
  }

  @Get('audit')
  audit() {
    return this.admin.audit();
  }

  @Get('claims')
  claims() {
    return this.admin.claims();
  }

  @Patch('claims/:id')
  reviewClaim(@Param('id') id: string, @Body() dto: ReviewClaimDto) {
    return this.admin.reviewClaim(id, dto.status);
  }

  @Get('appeals')
  appeals() {
    return this.admin.appeals();
  }

  @Patch('appeals/:id')
  resolveAppeal(@Param('id') id: string, @Body() dto: ResolveAppealDto) {
    return this.admin.resolveAppeal(id, dto.status, dto.resolution);
  }

  @Get('tickets')
  @Roles(UserRole.ADMIN)
  tickets() {
    return this.admin.tickets();
  }

  @Patch('tickets/:id')
  @Roles(UserRole.ADMIN)
  closeTicket(@Param('id') id: string) {
    return this.admin.closeTicket(id);
  }

  @Get('content/:key')
  @Roles(UserRole.ADMIN)
  content(@Param('key') key: string) {
    return this.admin.content(key);
  }

  @Put('content/:key')
  @Roles(UserRole.ADMIN)
  saveContent(@Param('key') key: string, @Body() dto: SaveContentDto) {
    return this.admin.saveContent(key, dto.body);
  }

  @Post('maintenance/purge-evidence')
  @Roles(UserRole.ADMIN)
  purge(@CurrentUser() user: AuthUser, @Body() dto: DestructiveConfirmDto) {
    return this.admin.purgeEvidence(user.id, dto.password, dto.confirm);
  }
}
