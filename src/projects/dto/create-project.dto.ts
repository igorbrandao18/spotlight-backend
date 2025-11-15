import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ProjectPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export enum ProjectStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export class ProjectMemberDto {
  @ApiProperty({
    description: 'User ID to add as member',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Member role',
    example: 'Developer',
    required: false,
  })
  @IsOptional()
  @IsString()
  role?: string;
}

export class ProjectMilestoneDto {
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
    description: 'Due date',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  dueDate?: Date;

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

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project title',
    example: 'Website Redesign',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Project description',
    example: 'Complete redesign of company website',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Project category',
    example: 'Web Development',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Project priority',
    enum: ProjectPriority,
    example: ProjectPriority.HIGH,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectPriority)
  priority?: ProjectPriority;

  @ApiProperty({
    description: 'Project status',
    enum: ProjectStatus,
    example: ProjectStatus.TODO,
    required: false,
  })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiProperty({
    description: 'Project members',
    type: [ProjectMemberDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMemberDto)
  members?: ProjectMemberDto[];

  @ApiProperty({
    description: 'Project milestones',
    type: [ProjectMilestoneDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectMilestoneDto)
  milestones?: ProjectMilestoneDto[];

  // File will be handled via multipart/form-data
  file?: Express.Multer.File;
}
