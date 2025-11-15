import { IsString, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePartnerStoreDto {
  @ApiProperty({
    description: 'Store name',
    example: 'Camera Store Pro',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Store description',
    example: 'Professional photography equipment store',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Store website URL',
    example: 'https://camerastorepro.com',
    required: false,
  })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({
    description: 'Store email',
    example: 'contact@camerastorepro.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Store phone number',
    example: '+55 11 98765-4321',
    required: false,
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    description: 'Store address',
    example: '123 Main St, São Paulo, SP',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  // Files will be handled via multipart/form-data
  logo?: Express.Multer.File;
  coverImage?: Express.Multer.File;
}
