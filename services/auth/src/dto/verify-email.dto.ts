import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

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
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  email!: string;
}
