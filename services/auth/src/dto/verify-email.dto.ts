import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class VerifyCodeDto {
  @Matches(/^\d{6}$/)
  code!: string;
}

export class VerifyLinkDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token!: string;
}

export class PasswordResetDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Geçerli bir e-posta yazın.' })
  @MaxLength(120)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  captchaToken?: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(20)
  @MaxLength(200)
  token!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class MfaDto {
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  mfaToken!: string;

  @IsOptional()
  @Matches(/^\d{6}$/)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(32)
  recoveryCode?: string;
}

export class ConfirmTotpDto {
  @Matches(/^\d{6}$/)
  code!: string;
}
