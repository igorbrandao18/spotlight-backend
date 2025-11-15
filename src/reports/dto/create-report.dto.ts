import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateReportDto {
  @IsOptional()
  @IsUUID()
  reportedUserId?: string;

  @IsOptional()
  reportedProjectId?: number;

  @IsOptional()
  reportedPortfolioItemId?: number;

  @IsString()
  reason: string;

  @IsString()
  category: string;
}

