import { BadgeMetric, ModerationStatus, UserRole, VenueStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminUserQuery {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  q?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  disabled?: boolean;
}

export class UpdateRestaurantDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  cuisine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  addressHint?: string;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brandName?: string;

  @IsOptional()
  @IsEnum(VenueStatus)
  status?: VenueStatus;
}

export class ReviewClaimDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}

export class ResolveAppealDto {
  @IsIn(['RESOLVED', 'REJECTED'])
  status!: 'RESOLVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resolution?: string;
}

export class SaveContentDto {
  @IsString()
  @MinLength(10)
  @MaxLength(20000)
  body!: string;
}

export class ModerateReportDto {
  @IsOptional()
  @IsEnum(ModerationStatus)
  status?: ModerationStatus;

  @IsOptional()
  @IsBoolean()
  hidden?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class AdminReportQuery {
  @IsOptional()
  @IsEnum(ModerationStatus)
  status?: ModerationStatus;
}

export class UpsertBadgeDto {
  @IsString()
  @Matches(/^[a-z0-9-]{2,40}$/)
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(40)
  name!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(160)
  description!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8)
  icon!: string;

  @IsEnum(BadgeMetric)
  metric!: BadgeMetric;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  threshold!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  sortOrder!: number;

  @IsBoolean()
  enabled!: boolean;
}

export class GrantBadgeDto {
  @IsString()
  @MinLength(8)
  @MaxLength(40)
  badgeId!: string;
}

export class RenameLocationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;
}

export class DestructiveConfirmDto {
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  password!: string;

  @IsString()
  @MinLength(4)
  @MaxLength(40)
  confirm!: string;
}

export class MergeCityDto extends DestructiveConfirmDto {
  @IsString()
  @MinLength(8)
  @MaxLength(40)
  intoCityId!: string;
}

export class ThreatReportDto {
  @IsBoolean()
  threat!: boolean;
}

export class UpdateSettingDto {
  @IsString()
  @MaxLength(500)
  value!: string;
}

export class UpdateTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20000)
  htmlBody!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(8000)
  textBody!: string;
}

export class PreviewTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  verifyUrl?: string;
}
