import { IsString, IsOptional } from 'class-validator';

export class CreatePortfolioCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

