import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ProjectStatus } from './create-project.dto';

export class CreateMilestoneDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @IsOptional()
  order?: number;
}

