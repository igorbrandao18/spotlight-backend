import {
  Controller,
  Post,
  Body,
  Put,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { AuthenticationResponseDto } from './dto/authentication-response.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Extract IP address from request
   */
  private getIpAddress(req: Request): string | undefined {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket.remoteAddress
    );
  }

  /**
   * Extract User-Agent from request
   */
  private getUserAgent(req: Request): string | undefined {
    return req.headers['user-agent'];
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account and returns authentication tokens with user information. The user is automatically logged in after registration.',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered and authenticated',
    type: AuthenticationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Validation failed or email already exists',
    schema: {
      example: {
        statusCode: 400,
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account with this email already exists',
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Validation errors',
    schema: {
      example: {
        statusCode: 422,
        message: [
          'email must be an email',
          'password must be longer than or equal to 6 characters',
          'name should not be empty',
        ],
        error: 'Unprocessable Entity',
      },
    },
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ): Promise<AuthenticationResponseDto> {
    return this.authService.register(
      registerDto,
      this.getIpAddress(req),
      this.getUserAgent(req),
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user',
    description:
      'Authenticates a user with email and password, returning authentication tokens and user information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthenticationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials or account disabled',
    schema: {
      example: {
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Validation errors',
    schema: {
      example: {
        statusCode: 422,
        message: ['email must be an email', 'password should not be empty'],
        error: 'Unprocessable Entity',
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthenticationResponseDto> {
    return this.authService.login(
      loginDto,
      this.getIpAddress(req),
      this.getUserAgent(req),
    );
  }

  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Refreshes the access token using a valid refresh token. The old refresh token is invalidated and a new one is issued.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthenticationResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired refresh token',
    schema: {
      example: {
        statusCode: 401,
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Validation errors',
    schema: {
      example: {
        statusCode: 422,
        message: ['refreshToken should not be empty'],
        error: 'Unprocessable Entity',
      },
    },
  })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<AuthenticationResponseDto> {
    return this.authService.refreshToken(
      refreshTokenDto,
      this.getIpAddress(req),
    );
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends a password reset email to the user if the email exists. For security reasons, the response does not reveal whether the email exists.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if email exists)',
    schema: {
      example: {
        message: 'If the email exists, a password reset link has been sent',
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Validation errors',
    schema: {
      example: {
        statusCode: 422,
        message: ['email must be an email', 'urlCallback must be a string'],
        error: 'Unprocessable Entity',
      },
    },
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description:
      'Resets the user password using a token received via email. The token is single-use and expires after a set time.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      example: {
        message: 'Password reset successfully. Please login with your new password.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid or expired token, or passwords do not match',
    schema: {
      example: {
        statusCode: 400,
        code: 'INVALID_RESET_TOKEN',
        message: 'Invalid or expired reset token',
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Validation errors',
    schema: {
      example: {
        statusCode: 422,
        message: [
          'token should not be empty',
          'password must be longer than or equal to 6 characters',
        ],
        error: 'Unprocessable Entity',
      },
    },
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update user password',
    description:
      'Updates the authenticated user password. Requires current password verification. All refresh tokens are invalidated after password change.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
    schema: {
      example: {
        message: 'Password updated successfully. Please login again.',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Passwords do not match or validation failed',
    schema: {
      example: {
        statusCode: 400,
        code: 'PASSWORDS_DO_NOT_MATCH',
        message: 'New password and confirmation do not match',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid current password or missing token',
    schema: {
      example: {
        statusCode: 401,
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
    schema: {
      example: {
        statusCode: 404,
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      },
    },
  })
  @ApiResponse({
    status: 422,
    description: 'Unprocessable Entity - Validation errors',
    schema: {
      example: {
        statusCode: 422,
        message: [
          'currentPassword should not be empty',
          'newPassword must be longer than or equal to 6 characters',
        ],
        error: 'Unprocessable Entity',
      },
    },
  })
  async updatePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.updatePassword(user.id, updatePasswordDto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Logs out the authenticated user by invalidating all refresh tokens. The user will need to login again to obtain new tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
    schema: {
      example: {
        message: 'Logged out successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
    schema: {
      example: {
        statusCode: 401,
        message: 'Unauthorized',
      },
    },
  })
  async logout(@CurrentUser() user: CurrentUserPayload): Promise<{ message: string }> {
    return this.authService.logout(user.id);
  }
}
