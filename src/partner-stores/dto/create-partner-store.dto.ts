import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreatePartnerStoreDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  // Files will be handled via multipart/form-data
  logo?: Express.Multer.File;
  coverImage?: Express.Multer.File;
}

