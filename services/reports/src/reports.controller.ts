import { Body, Controller, Param, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthUser, CurrentUser, JwtAuthGuard, VerifiedEmailGuard } from '@yemesek/auth';
import { reportFilesInterceptor, type IncomingImage } from '@yemesek/evidence';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('restaurants/:restaurantId/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, VerifiedEmailGuard)
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
