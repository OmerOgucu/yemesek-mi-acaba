import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

function trimString({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Geçerli bir e-posta yazın.' })
  @MaxLength(120, { message: 'E-posta en fazla 120 karakter olmalı.' })
  email!: string;

  @IsString({ message: 'Parola metin olmalı.' })
  @MinLength(8, { message: 'Parola en az 8 karakter olmalı.' })
  @MaxLength(72, { message: 'Parola en fazla 72 karakter olmalı.' })
  password!: string;

  @Transform(trimString)
  @IsString({ message: 'Görünen ad metin olmalı.' })
  @MinLength(2, { message: 'Görünen ad en az 2 karakter olmalı.' })
  @MaxLength(32, { message: 'Görünen ad en fazla 32 karakter olmalı.' })
  @Matches(/^[\p{L}\p{N} ._'-]+$/u, { message: 'Görünen adta yalnızca harf, rakam ve boşluk kullanın.' })
  displayName!: string;

  @Equals(true, { message: 'KVKK aydınlatma metnini kabul etmelisin.' })
  acceptKvkk!: boolean;

  @Equals(true, { message: 'Kullanım koşullarını kabul etmelisin.' })
  acceptTerms!: boolean;

  @IsOptional()
  @IsBoolean({ message: 'Pazarlama tercihi doğru veya yanlış olmalı.' })
  acceptMarketing?: boolean;

  @Equals(true, { message: '18 yaşından büyük olduğunu onaylamalısın.' })
  ageConfirmed!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  captchaToken?: string;
}
