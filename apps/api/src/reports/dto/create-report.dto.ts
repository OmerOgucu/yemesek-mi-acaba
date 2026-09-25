import { ReportCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export class CreateReportDto {
  @IsEnum(ReportCategory, { message: 'Şikayet kategorisi geçersiz.' })
  category!: ReportCategory;

  @Type(() => Number)
  @IsInt({ message: 'Şiddet 1 ile 5 arasında tam sayı olmalı.' })
  @Min(1, { message: 'Şiddet en az 1 olmalı.' })
  @Max(5, { message: 'Şiddet en fazla 5 olmalı.' })
  severity!: number;

  @Transform(trimString)
  @IsString({ message: 'Başlık metin olmalı.' })
  @MinLength(8, { message: 'Başlık en az 8 karakter olmalı.' })
  @MaxLength(120, { message: 'Başlık en fazla 120 karakter olmalı.' })
  title!: string;

  @Transform(trimString)
  @IsString({ message: 'Şikayet metin olmalı.' })
  @MinLength(20, { message: 'Şikayet en az 20 karakter olmalı.' })
  @MaxLength(2000, { message: 'Şikayet en fazla 2000 karakter olmalı.' })
  body!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Takma ad metin olmalı.' })
  @MinLength(2, { message: 'Takma ad en az 2 karakter olmalı.' })
  @MaxLength(32, { message: 'Takma ad en fazla 32 karakter olmalı.' })
  @Matches(/^[\p{L}\p{N} ._'-]+$/u, {
    message: 'Takma adta yalnızca harf, rakam ve boşluk kullanın.',
  })
  nickname?: string;
}
