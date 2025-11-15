import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePortfolioCommentDto {
  @ApiProperty({
    description: 'Comment content',
    example: 'Amazing work! The colors are stunning.',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Parent comment ID for nested comments',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}
