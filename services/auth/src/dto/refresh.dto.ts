import { IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString({ message: 'Yenileme jetonu metin olmalı.' })
  @MinLength(20, { message: 'Yenileme jetonu geçersiz.' })
  @MaxLength(200, { message: 'Yenileme jetonu geçersiz.' })
  refreshToken!: string;
}
