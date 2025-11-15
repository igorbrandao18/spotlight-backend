import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/user.interface';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  async findAll() {
    // TODO: Add admin check
    return this.reportsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // TODO: Add admin check
    return this.reportsService.findOne(id);
  }

  @Post('new')
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createDto: CreateReportDto,
  ) {
    return this.reportsService.create(user.id, createDto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateReportDto) {
    // TODO: Add admin check
    return this.reportsService.update(id, updateDto);
  }
}
