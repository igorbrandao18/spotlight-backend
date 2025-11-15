import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePostDto {
  @ApiProperty({
    description: 'Post content',
    example: 'Updated post content',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'Post description',
    example: 'Updated description',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Equipment used',
    example: 'Canon EOS R5',
    required: false,
  })
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiProperty({
    description: 'Location',
    example: 'Rio de Janeiro, Brazil',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Software used',
    example: 'Adobe Lightroom',
    required: false,
  })
  @IsOptional()
  @IsString()
  software?: string;

  // Image will be handled via multipart/form-data
  image?: Express.Multer.File;
}
