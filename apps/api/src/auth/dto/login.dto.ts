import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Geçerli bir e-posta yazın.' })
  @MaxLength(120, { message: 'E-posta en fazla 120 karakter olmalı.' })
  email!: string;

  @IsString({ message: 'Parola metin olmalı.' })
  @MinLength(8, { message: 'Parola en az 8 karakter olmalı.' })
  @MaxLength(72, { message: 'Parola en fazla 72 karakter olmalı.' })
  password!: string;
}
