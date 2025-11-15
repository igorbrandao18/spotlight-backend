import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateChatRoomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];

  // For 1-on-1 chat
  @IsOptional()
  @IsString()
  userId?: string;
}

