import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePortfolioItemDto {
  @ApiProperty({
    description: 'Portfolio item title',
    example: 'Sunset Photography Series',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Portfolio item description',
    example: 'A collection of sunset photographs from various locations',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  // Files will be handled via multipart/form-data
  files?: Express.Multer.File[];
}
