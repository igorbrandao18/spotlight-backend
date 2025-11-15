import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEquipmentDto {
  @ApiProperty({
    description: 'Equipment name',
    example: 'Canon EOS R5',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Equipment description',
    example: 'Professional mirrorless camera with 45MP sensor',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Equipment price',
    example: 3999.99,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  price?: number;

  @ApiProperty({
    description: 'Equipment category',
    example: 'Cameras',
    required: false,
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Partner store ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  partnerStoreId: string;

  // Files will be handled via multipart/form-data
  files?: Express.Multer.File[];
}
