import { Module } from '@nestjs/common';
import { AuthModule } from '@yemesek/auth';
import { RestaurantsModule } from '@yemesek/restaurants';
import { MediaController } from './media.controller';

@Module({
  imports: [AuthModule, RestaurantsModule],
  controllers: [MediaController],
})
export class MediaModule {}
