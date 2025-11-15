import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreatePortfolioItemDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  // Files will be handled via multipart/form-data
  files?: Express.Multer.File[];
}

