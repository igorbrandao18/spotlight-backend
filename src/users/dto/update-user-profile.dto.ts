import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class SocialLinkDto {
  @ApiProperty({
    description: 'Social media platform',
    example: 'Instagram',
  })
  @IsString()
  platform: string;

  @ApiProperty({
    description: 'Social media URL',
    example: 'https://instagram.com/username',
  })
  @IsString()
  url: string;
}

class WebsiteDto {
  @ApiProperty({
    description: 'Website URL',
    example: 'https://example.com',
  })
  @IsString()
  url: string;
}

class LocationDto {
  @ApiProperty({
    description: 'Location address',
    example: 'São Paulo, SP, Brazil',
  })
  @IsString()
  address: string;
}

class AvailabilityDto {
  @IsOptional()
  @IsString()
  monday?: string;

  @IsOptional()
  @IsString()
  tuesday?: string;

  @IsOptional()
  @IsString()
  wednesday?: string;

  @IsOptional()
  @IsString()
  thursday?: string;

  @IsOptional()
  @IsString()
  friday?: string;

  @IsOptional()
  @IsString()
  saturday?: string;

  @IsOptional()
  @IsString()
  sunday?: string;
}

class RateDto {
  @IsOptional()
  hourly?: number;

  @IsOptional()
  daily?: number;

  @IsOptional()
  weekly?: number;

  @IsOptional()
  monthly?: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  areaActivity?: string;

  @IsOptional()
  @IsString()
  chatAvailability?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  shortBio?: string;

  @IsOptional()
  @IsString()
  specialties?: string; // Comma-separated string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialLinkDto)
  socialLinks?: SocialLinkDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebsiteDto)
  websites?: WebsiteDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationDto)
  locations?: LocationDto[];

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  timeOfExperience?: string;

  @IsOptional()
  @IsString()
  notableClients?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AvailabilityDto)
  availability?: AvailabilityDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => RateDto)
  rates?: RateDto;
}
