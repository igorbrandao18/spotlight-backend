import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({
    description: 'Post content',
    example: 'Check out my latest photography work!',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Post description',
    example: 'A beautiful sunset captured in the mountains',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Equipment used',
    example: 'Canon EOS R5, 24-70mm f/2.8',
    required: false,
  })
  @IsOptional()
  @IsString()
  equipment?: string;

  @ApiProperty({
    description: 'Location where the post was created',
    example: 'São Paulo, Brazil',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Software used for editing',
    example: 'Adobe Lightroom, Photoshop',
    required: false,
  })
  @IsOptional()
  @IsString()
  software?: string;

  // Image will be handled via multipart/form-data
  image?: Express.Multer.File;
}
