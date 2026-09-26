import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

const NAME = /^[\p{L}\p{N}][\p{L}\p{N} &'.,()-]{1,79}$/u;

export class CreateRestaurantDto {
  @Transform(trimString)
  @IsString({ message: 'Mekan adı metin olmalı.' })
  @MinLength(2, { message: 'Mekan adı en az 2 karakter olmalı.' })
  @MaxLength(80, { message: 'Mekan adı en fazla 80 karakter olmalı.' })
  @Matches(NAME, { message: 'Mekan adında yalnızca harf, rakam ve basit noktalama kullanın.' })
  name!: string;

  @Transform(trimString)
  @IsString({ message: 'Şehir metin olmalı.' })
  @MinLength(2, { message: 'Şehir en az 2 karakter olmalı.' })
  @MaxLength(60, { message: 'Şehir en fazla 60 karakter olmalı.' })
  city!: string;

  @Transform(trimString)
  @IsString({ message: 'İlçe metin olmalı.' })
  @MinLength(2, { message: 'İlçe en az 2 karakter olmalı.' })
  @MaxLength(60, { message: 'İlçe en fazla 60 karakter olmalı.' })
  district!: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Semt metin olmalı.' })
  @MaxLength(120, { message: 'Semt en fazla 120 karakter olmalı.' })
  addressHint?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Mutfak metin olmalı.' })
  @MaxLength(40, { message: 'Mutfak en fazla 40 karakter olmalı.' })
  cuisine?: string;

  @IsOptional()
  @Transform(trimString)
  @IsString({ message: 'Marka metin olmalı.' })
  @MaxLength(80, { message: 'Marka en fazla 80 karakter olmalı.' })
  brandName?: string;
}
