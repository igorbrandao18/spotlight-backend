import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../common/services/password.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import {
  AuthenticationResponse,
  TokenInfo,
  UserInfo,
  AccountInfo,
  SessionInfo,
} from './interfaces/auth-response.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordService: PasswordService,
  ) {}

  /**
   * Register a new user and return professional authentication response
   */
  async register(
    registerDto: RegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthenticationResponse> {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      this.logger.warn(`Registration failed: Email already exists - ${registerDto.email}`);
      throw new BadRequestException({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'An account with this email already exists',
      });
    }

    // Hash password using Argon2
    const hashedPassword = await this.passwordService.hash(registerDto.password);

    // Create user in transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: registerDto.email.toLowerCase().trim(),
          name: registerDto.name.trim(),
          password: hashedPassword,
          areaActivity: registerDto.areaActivity?.trim() || null,
          role: 'USER',
          enabled: true,
          isPro: false,
          isVerified: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          areaActivity: true,
          avatar: true,
          coverImage: true,
          role: true,
          enabled: true,
          isPro: true,
          isVerified: true,
          createdAt: true,
        },
      });

      // Create default user preferences
      await tx.userPreferences.create({
        data: {
          userId: newUser.id,
        },
      });

      this.logger.log(`User created successfully: ${newUser.id}`);
      return newUser;
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Build professional response
    const response = this.buildAuthenticationResponse(
      user,
      tokens,
      ipAddress,
      userAgent,
      true, // firstLogin
    );

    this.logger.log(`User registered and authenticated successfully: ${user.id}`);
    return response;
  }

  /**
   * Authenticate user and return professional authentication response
   */
  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthenticationResponse> {
    this.logger.log(`Login attempt for email: ${loginDto.email}`);

    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        areaActivity: true,
        avatar: true,
        coverImage: true,
        role: true,
        enabled: true,
        isPro: true,
        isVerified: true,
        createdAt: true,
        refreshTokens: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      this.logger.warn(`Login failed: User not found - ${loginDto.email}`);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    if (!user.enabled) {
      this.logger.warn(`Login failed: Account disabled - ${user.id}`);
      throw new UnauthorizedException({
        code: 'ACCOUNT_DISABLED',
        message: 'Your account has been disabled. Please contact support.',
      });
    }

    // Verify password (supports both Argon2 and legacy BCrypt)
    const isPasswordValid = await this.verifyPassword(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      this.logger.warn(`Login failed: Invalid password - ${user.id}`);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    // Migrate password to Argon2 if it's still using BCrypt
    if (user.password.startsWith('$2')) {
      this.logger.log(`Migrating password to Argon2 for user: ${user.id}`);
      const newHash = await this.passwordService.hash(loginDto.password);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: newHash },
      });
    }

    // Check if this is first login (no previous refresh tokens)
    const isFirstLogin = !user.refreshTokens || user.refreshTokens.length === 0;

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Build professional response
    const response = this.buildAuthenticationResponse(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        areaActivity: user.areaActivity,
        avatar: user.avatar,
        coverImage: user.coverImage,
        role: user.role,
        enabled: user.enabled,
        isPro: user.isPro,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      tokens,
      ipAddress,
      userAgent,
      isFirstLogin,
    );

    this.logger.log(`User authenticated successfully: ${user.id}`);
    return response;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    ipAddress?: string,
  ): Promise<AuthenticationResponse> {
    this.logger.log('Refresh token attempt');

    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token: refreshTokenDto.refreshToken },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            areaActivity: true,
            avatar: true,
            coverImage: true,
            role: true,
            enabled: true,
            isPro: true,
            isVerified: true,
            createdAt: true,
          },
        },
      },
    });

    if (!refreshToken) {
      this.logger.warn('Refresh token failed: Token not found');
      throw new UnauthorizedException({
        code: 'INVALID_REFRESH_TOKEN',
        message: 'Invalid or expired refresh token',
      });
    }

    if (refreshToken.expiresAt < new Date()) {
      this.logger.warn(`Refresh token failed: Token expired - ${refreshToken.id}`);
      // Clean up expired token
      await this.prisma.refreshToken.delete({
        where: { id: refreshToken.id },
      }).catch(() => {
        // Ignore errors during cleanup
      });
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_EXPIRED',
        message: 'Refresh token has expired. Please login again.',
      });
    }

    if (!refreshToken.user.enabled) {
      this.logger.warn(`Refresh token failed: User disabled - ${refreshToken.userId}`);
      throw new UnauthorizedException({
        code: 'ACCOUNT_DISABLED',
        message: 'Your account has been disabled. Please contact support.',
      });
    }

    // Delete old refresh token (one-time use)
    await this.prisma.refreshToken.delete({
      where: { id: refreshToken.id },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(refreshToken.userId);

    // Build professional response
    const response = this.buildAuthenticationResponse(
      refreshToken.user,
      tokens,
      ipAddress,
      undefined,
      false, // Not first login
    );

    this.logger.log(`Token refreshed successfully: ${refreshToken.userId}`);
    return response;
  }

  /**
   * Request password reset
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    this.logger.log(`Password reset request for email: ${forgotPasswordDto.email}`);

    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email.toLowerCase().trim() },
    });

    // Don't reveal if user exists (security best practice)
    if (!user) {
      this.logger.warn(`Password reset request: User not found - ${forgotPasswordDto.email}`);
      return {
        message: 'If the email exists, a password reset link has been sent',
      };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiry

    // TODO: Store reset token in database (create PasswordResetToken model)
    // TODO: Send email with reset link using nodemailer

    this.logger.log(`Password reset token generated for user: ${user.id}`);
    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  /**
   * Reset password using token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    this.logger.log('Password reset attempt');

    // TODO: Validate token from database
    // TODO: Check token expiration
    // TODO: Update user password
    // TODO: Invalidate token after use

    throw new BadRequestException({
      code: 'FEATURE_NOT_IMPLEMENTED',
      message: 'Password reset functionality is not yet fully implemented',
    });
  }

  /**
   * Update user password
   */
  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    this.logger.log(`Password update request for user: ${userId}`);

    if (
      updatePasswordDto.newPassword !== updatePasswordDto.confirmNewPassword
    ) {
      throw new BadRequestException({
        code: 'PASSWORDS_DO_NOT_MATCH',
        message: 'New password and confirmation do not match',
      });
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      this.logger.warn(`Password update failed: User not found - ${userId}`);
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    // Verify current password (supports both Argon2 and legacy BCrypt)
    const isCurrentPasswordValid = await this.verifyPassword(
      updatePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      this.logger.warn(`Password update failed: Invalid current password - ${userId}`);
      throw new UnauthorizedException({
        code: 'INVALID_CURRENT_PASSWORD',
        message: 'Current password is incorrect',
      });
    }

    // Hash new password using Argon2
    const hashedPassword = await this.passwordService.hash(updatePasswordDto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all refresh tokens (force re-login)
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    this.logger.log(`Password updated successfully: ${userId}`);
    return { message: 'Password updated successfully. Please login again.' };
  }

  /**
   * Logout user and invalidate all refresh tokens
   */
  async logout(userId: string): Promise<{ message: string }> {
    this.logger.log(`Logout request for user: ${userId}`);

    const deletedCount = await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    this.logger.log(`User logged out: ${userId} (${deletedCount.count} tokens invalidated)`);
    return { message: 'Logged out successfully' };
  }

  /**
   * Generate JWT access token and refresh token
   */
  private async generateTokens(userId: string): Promise<TokenInfo> {
    const payload = { sub: userId };

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '1h';
    const expiresInSeconds = this.parseExpiresIn(expiresIn);

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn,
    });

    const refreshTokenValue = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt,
      },
    });

    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(tokenExpiresAt.getSeconds() + expiresInSeconds);

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      tokenType: 'Bearer',
      expiresIn: expiresInSeconds,
      expiresAt: tokenExpiresAt,
    };
  }

  /**
   * Build professional authentication response
   */
  private buildAuthenticationResponse(
    user: {
      id: string;
      email: string;
      name: string;
      areaActivity: string | null;
      avatar: string | null;
      coverImage: string | null;
      role: string;
      enabled: boolean;
      isPro: boolean;
      isVerified: boolean;
      createdAt: Date;
    },
    tokens: TokenInfo,
    ipAddress?: string,
    userAgent?: string,
    isFirstLogin = false,
  ): AuthenticationResponse {
    return {
      tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        areaActivity: user.areaActivity,
        avatar: user.avatar,
        coverImage: user.coverImage,
        role: user.role,
      },
      account: {
        status: user.enabled ? 'ACTIVE' : 'INACTIVE',
        enabled: user.enabled,
        firstLogin: isFirstLogin,
        plan: null, // TODO: Implement plan system
        isPro: user.isPro,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      session: {
        authenticatedAt: new Date(),
        ipAddress: ipAddress || null,
        requiresPasswordChange: false,
        deviceInfo: userAgent
          ? {
              userAgent,
              platform: this.detectPlatform(userAgent),
            }
          : undefined,
      },
    };
  }

  /**
   * Verify password supporting both Argon2 and legacy BCrypt
   * This allows gradual migration from BCrypt to Argon2
   * 
   * @param password Plain text password
   * @param hash Stored password hash (Argon2 or BCrypt)
   * @returns True if password matches
   */
  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    // Check if hash is BCrypt (starts with $2)
    if (hash.startsWith('$2')) {
      // Legacy BCrypt hash
      this.logger.debug('Verifying password with BCrypt (legacy)');
      return bcrypt.compare(password, hash);
    }

    // Argon2 hash (starts with $argon2id$ or $argon2i$ or $argon2d$)
    this.logger.debug('Verifying password with Argon2');
    return this.passwordService.verify(hash, password);
  }

  /**
   * Parse expiresIn string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 3600; // Default 1 hour
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 3600;
    }
  }

  /**
   * Detect platform from user agent
   */
  private detectPlatform(userAgent: string): string {
    if (/mobile/i.test(userAgent)) {
      return 'mobile';
    }
    if (/tablet/i.test(userAgent)) {
      return 'tablet';
    }
    return 'web';
  }
}
