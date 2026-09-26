import { IsString, MaxLength, MinLength } from 'class-validator';

export class DeleteAccountDto {
  @IsString({ message: 'Parola metin olmalı.' })
  @MinLength(8, { message: 'Parola en az 8 karakter olmalı.' })
  @MaxLength(72, { message: 'Parola en fazla 72 karakter olmalı.' })
  password!: string;
}
