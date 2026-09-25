import { Body, Controller, Param, Post } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('restaurants/:restaurantId/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  create(@Param('restaurantId') restaurantId: string, @Body() dto: CreateReportDto) {
    return this.reports.create(restaurantId, dto);
  }
}
