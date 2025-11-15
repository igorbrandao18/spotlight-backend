import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  REJECTED = 'REJECTED',
  CONCLUDED = 'CONCLUDED',
}

export class UpdateReportDto {
  @ApiProperty({
    description: 'Admin conclusion notes',
    example: 'Report reviewed and user warned',
    required: false,
  })
  @IsOptional()
  @IsString()
  conclusion?: string;

  @ApiProperty({
    description: 'Report status',
    enum: ReportStatus,
    example: ReportStatus.REVIEWED,
  })
  @IsEnum(ReportStatus)
  status: ReportStatus;
}
