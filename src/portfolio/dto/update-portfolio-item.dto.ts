import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePortfolioItemDto {
  @ApiProperty({
    description: 'Portfolio item title',
    example: 'Updated Portfolio Title',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Portfolio item description',
    example: 'Updated description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  // Files will be handled via multipart/form-data
  files?: Express.Multer.File[];
}
