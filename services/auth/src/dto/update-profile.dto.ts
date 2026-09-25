import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Görünen ad metin olmalı.' })
  @MinLength(2, { message: 'Görünen ad en az 2 karakter olmalı.' })
  @MaxLength(32, { message: 'Görünen ad en fazla 32 karakter olmalı.' })
  @Matches(/^[\p{L}\p{N} ._'-]+$/u, { message: 'Görünen adta yalnızca harf, rakam ve boşluk kullanın.' })
  displayName?: string;

  @IsOptional()
  @IsBoolean({ message: 'Pazarlama tercihi doğru veya yanlış olmalı.' })
  acceptMarketing?: boolean;
}
