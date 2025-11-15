import { IsString, IsOptional, IsNumber, IsUUID } from 'class-validator';

export class CreateEquipmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsUUID()
  partnerStoreId: string;

  // Files will be handled via multipart/form-data
  files?: Express.Multer.File[];
}

