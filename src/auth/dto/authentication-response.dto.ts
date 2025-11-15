import { ApiProperty } from '@nestjs/swagger';

export class TokenInfoDto {
  @ApiProperty({
    description: 'JWT access token for authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'dGhpc2lzYXJlZnJlc2h0b2tlbg...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
    enum: ['Bearer'],
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Token expiration timestamp',
    example: '2025-11-15T22:50:05.000Z',
  })
  expiresAt: Date;
}

export class UserInfoDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User full name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User area of activity',
    example: 'Photography',
    nullable: true,
  })
  areaActivity: string | null;

  @ApiProperty({
    description: 'User avatar URL',
    example: 'https://example.com/avatars/user123.jpg',
    nullable: true,
  })
  avatar: string | null;

  @ApiProperty({
    description: 'User cover image URL',
    example: 'https://example.com/covers/user123.jpg',
    nullable: true,
  })
  coverImage: string | null;

  @ApiProperty({
    description: 'User role',
    example: 'USER',
    enum: ['USER', 'ADMIN'],
  })
  role: string;
}

export class PlanInfoDto {
  @ApiProperty({
    description: 'Plan unique identifier',
    example: 'plan-uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Plan name',
    example: 'STARTER',
  })
  name: string;

  @ApiProperty({
    description: 'Plan description',
    example: 'Starter plan for new users',
    nullable: true,
  })
  description: string | null;
}

export class AccountInfoDto {
  @ApiProperty({
    description: 'Account status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
  })
  status: string;

  @ApiProperty({
    description: 'Whether the account is enabled',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'Whether this is the first login',
    example: true,
  })
  firstLogin: boolean;

  @ApiProperty({
    description: 'User plan information',
    type: PlanInfoDto,
    nullable: true,
  })
  plan: PlanInfoDto | null;

  @ApiProperty({
    description: 'Whether user has Pro subscription',
    example: false,
  })
  isPro: boolean;

  @ApiProperty({
    description: 'Whether user email is verified',
    example: false,
  })
  isVerified: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2025-11-15T22:50:05.000Z',
  })
  createdAt: Date;
}

export class DeviceInfoDto {
  @ApiProperty({
    description: 'User agent string',
    example: 'Mozilla/5.0...',
    required: false,
  })
  userAgent?: string;

  @ApiProperty({
    description: 'Device platform',
    example: 'web',
    required: false,
  })
  platform?: string;
}

export class SessionInfoDto {
  @ApiProperty({
    description: 'Authentication timestamp',
    example: '2025-11-15T22:50:05.000Z',
  })
  authenticatedAt: Date;

  @ApiProperty({
    description: 'Client IP address',
    example: '192.168.1.1',
    nullable: true,
  })
  ipAddress: string | null;

  @ApiProperty({
    description: 'Whether password change is required',
    example: false,
  })
  requiresPasswordChange: boolean;

  @ApiProperty({
    description: 'Device information',
    type: DeviceInfoDto,
    required: false,
  })
  deviceInfo?: DeviceInfoDto;
}

export class AuthenticationResponseDto {
  @ApiProperty({
    description: 'Authentication tokens',
    type: TokenInfoDto,
  })
  tokens: TokenInfoDto;

  @ApiProperty({
    description: 'Authenticated user information',
    type: UserInfoDto,
  })
  user: UserInfoDto;

  @ApiProperty({
    description: 'Account information and status',
    type: AccountInfoDto,
  })
  account: AccountInfoDto;

  @ApiProperty({
    description: 'Session metadata',
    type: SessionInfoDto,
  })
  session: SessionInfoDto;
}

