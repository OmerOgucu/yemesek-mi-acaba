import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateVoteDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Oy anahtarı metin olmalı.' })
  @MinLength(8, { message: 'Oy anahtarı en az 8 karakter olmalı.' })
  @MaxLength(64, { message: 'Oy anahtarı en fazla 64 karakter olmalı.' })
  @Matches(/^[A-Za-z0-9_-]+$/, { message: 'Oy anahtarı geçersiz.' })
  voterKey!: string;
}
