import { IsString, IsOptional } from 'class-validator';

export class AddMemberDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  role?: string;
}

