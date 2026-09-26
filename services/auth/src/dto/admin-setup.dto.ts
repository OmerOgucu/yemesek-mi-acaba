import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class AdminSetupDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Geçerli bir e-posta yazın.' })
  @MaxLength(120)
  email!: string;

  @IsString()
  @MinLength(16)
  @MaxLength(200)
  setupSecret!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  displayName!: string;
}
