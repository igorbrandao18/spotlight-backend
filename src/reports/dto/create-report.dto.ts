import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({
    description: 'ID of the reported user',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  reportedUserId?: string;

  @ApiProperty({
    description: 'ID of the reported project',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  reportedProjectId?: string;

  @ApiProperty({
    description: 'ID of the reported portfolio item',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  reportedPortfolioItemId?: string;

  @ApiProperty({
    description: 'Reason for the report',
    example: 'SPAM',
    enum: ['SPAM', 'INAPPROPRIATE', 'HARASSMENT', 'FAKE', 'OTHER'],
  })
  @IsString()
  reason: string;

  @ApiProperty({
    description: 'Report category',
    example: 'USER',
    enum: ['USER', 'PROJECT', 'PORTFOLIO'],
  })
  @IsString()
  category: string;
}
