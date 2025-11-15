import { IsString, IsIn } from 'class-validator';

export class CreateReactionDto {
  @IsString()
  @IsIn(['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'])
  type: string;
}

