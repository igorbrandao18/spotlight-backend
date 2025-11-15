import { IsEmail, IsString, IsNotEmpty, IsUrl, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @MaxLength(255, { message: 'Email must not exceed 255 characters' })
  email: string;

  @ApiProperty({
    description: 'Callback URL for password reset (frontend URL where user will be redirected)',
    example: 'https://app.example.com/reset-password',
  })
  @IsString({ message: 'Callback URL must be a string' })
  @IsNotEmpty({ message: 'Callback URL is required' })
  @IsUrl({}, { message: 'Callback URL must be a valid URL' })
  @MaxLength(500, { message: 'Callback URL must not exceed 500 characters' })
  urlCallback: string;
}
