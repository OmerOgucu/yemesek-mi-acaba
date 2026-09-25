import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export class ListRestaurantsQuery {
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Arama metin olmalı.' })
  @MaxLength(60, { message: 'Arama en fazla 60 karakter olmalı.' })
  q?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'Şehir metin olmalı.' })
  @MaxLength(60, { message: 'Şehir en fazla 60 karakter olmalı.' })
  city?: string;

  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'İlçe metin olmalı.' })
  @MaxLength(60, { message: 'İlçe en fazla 60 karakter olmalı.' })
  district?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
