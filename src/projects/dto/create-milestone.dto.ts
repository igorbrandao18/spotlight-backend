import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ProjectStatus } from './create-project.dto';

export class CreateMilestoneDto {
  @ApiProperty({
    description: 'Milestone title',
    example: 'Phase 1 - Design',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Milestone description',
    example: 'Complete UI/UX design',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Due date (ISO format)',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiProperty({
    description: 'Milestone status',
    enum: ProjectStatus,
    example: ProjectStatus.TODO,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({
    description: 'Display order',
    example: 1,
    required: false,
  })
  @IsOptional()
  order?: number;
}
