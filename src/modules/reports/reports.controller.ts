import {
  BadRequestException,
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('monthly')
  getMonthlySummary(
    @CurrentUser('id') userId: string,
    @Query('month') monthStr?: string,
    @Query('year') yearStr?: string,
  ) {
    if (!monthStr || !yearStr) {
      throw new BadRequestException(
        'month and year query parameters are required',
      );
    }

    const month = Number.parseInt(monthStr, 10);
    const year = Number.parseInt(yearStr, 10);

    if (Number.isNaN(month) || month < 1 || month > 12) {
      throw new BadRequestException('Invalid month');
    }

    if (Number.isNaN(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Invalid year');
    }

    return this.reportsService.getMonthlySummary(userId, month, year);
  }
}
