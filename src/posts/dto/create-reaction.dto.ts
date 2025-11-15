import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReactionDto {
  @ApiProperty({
    description: 'Reaction type',
    enum: ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'],
    example: 'LIKE',
  })
  @IsString()
  @IsIn(['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD', 'ANGRY'])
  type: string;
}
