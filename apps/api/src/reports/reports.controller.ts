import { Body, Controller, Param, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { IncomingImage } from '../uploads/evidence-files';
import { reportFilesInterceptor } from '../uploads/report-files.interceptor';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('restaurants/:restaurantId/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(reportFilesInterceptor)
  create(
    @Param('restaurantId') restaurantId: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: AuthUser,
    @UploadedFiles() files: { photos?: IncomingImage[]; receipt?: IncomingImage[] },
  ) {
    return this.reports.create(restaurantId, dto, user, files ?? {});
  }
}
