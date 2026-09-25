import { Module } from '@nestjs/common';
import { RestaurantsModule } from '../restaurants/restaurants.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [RestaurantsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
