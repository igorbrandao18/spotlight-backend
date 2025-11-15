import { IsString, IsIn } from 'class-validator';

export class ChangeAvailabilityDto {
  @IsString()
  @IsIn(['AVAILABLE', 'BUSY', 'AWAY', 'OFFLINE'])
  availability: string;
}

