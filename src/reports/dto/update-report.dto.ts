import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum ReportStatus {
  PENDING = 'PENDING',
  REVIEWED = 'REVIEWED',
  REJECTED = 'REJECTED',
  CONCLUDED = 'CONCLUDED',
}

export class UpdateReportDto {
  @IsOptional()
  @IsString()
  conclusion?: string;

  @IsEnum(ReportStatus)
  status: ReportStatus;
}

