import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import * as bcrypt from 'bcrypt';
import type { AuthenticationResponse } from './interfaces/auth-response.interface';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await module.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();
  });

  describe('register', () => {
    it('should register a new user successfully and return professional response', async () => {
      const registerDto = {
        name: 'John Doe',
        email: `john${Date.now()}@example.com`,
        password: 'SecurePass123',
        areaActivity: 'Photography',
      };

      const result = (await service.register(
        registerDto,
        '192.168.1.1',
        'Mozilla/5.0',
      )) as AuthenticationResponse;

      // Verify professional response structure
      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result.tokens).toHaveProperty('tokenType', 'Bearer');
      expect(result.tokens).toHaveProperty('expiresIn');
      expect(result.tokens).toHaveProperty('expiresAt');

      expect(result).toHaveProperty('user');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('name', registerDto.name);
      expect(result.user).toHaveProperty('email', registerDto.email.toLowerCase());
      expect(result.user).toHaveProperty('areaActivity', registerDto.areaActivity);
      expect(result.user).toHaveProperty('role', 'USER');

      expect(result).toHaveProperty('account');
      expect(result.account).toHaveProperty('status', 'ACTIVE');
      expect(result.account).toHaveProperty('enabled', true);
      expect(result.account).toHaveProperty('firstLogin', true);
      expect(result.account).toHaveProperty('isPro', false);
      expect(result.account).toHaveProperty('isVerified', false);

      expect(result).toHaveProperty('session');
      expect(result.session).toHaveProperty('authenticatedAt');
      expect(result.session).toHaveProperty('ipAddress', '192.168.1.1');
      expect(result.session).toHaveProperty('requiresPasswordChange', false);
      expect(result.session.deviceInfo).toHaveProperty('userAgent', 'Mozilla/5.0');
      expect(result.session.deviceInfo).toHaveProperty('platform');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: registerDto.email.toLowerCase() },
      });
      expect(user).toBeDefined();
      expect(user.name).toBe(registerDto.name);
      expect(user.email).toBe(registerDto.email.toLowerCase());

      // Verify user preferences were created
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: user.id },
      });
      expect(preferences).toBeDefined();
    });

    it('should throw BadRequestException with error code if email already exists', async () => {
      const email = `existing${Date.now()}@example.com`;
      await TestHelpers.createUser({ email });

      const registerDto = {
        name: 'Another User',
        email,
        password: 'SecurePass123',
        areaActivity: 'Photography',
      };

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );

      try {
        await service.register(registerDto);
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'EMAIL_ALREADY_REGISTERED');
        expect(error.response).toHaveProperty('message');
      }
    });

    it('should hash password before storing', async () => {
      const registerDto = {
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'SecurePass123',
        areaActivity: 'Photography',
      };

      await service.register(registerDto);

      const user = await prisma.user.findUnique({
        where: { email: registerDto.email.toLowerCase() },
      });

      expect(user).toBeDefined();
      expect(user.password).not.toBe(registerDto.password);
      const isPasswordHashed = await bcrypt.compare(
        registerDto.password,
        user.password,
      );
      expect(isPasswordHashed).toBe(true);
    });

    it('should normalize email to lowercase', async () => {
      const registerDto = {
        name: 'Test User',
        email: `TEST${Date.now()}@EXAMPLE.COM`,
        password: 'SecurePass123',
        areaActivity: 'Photography',
      };

      const result = (await service.register(registerDto)) as AuthenticationResponse;
      expect(result.user.email).toBe(registerDto.email.toLowerCase());

      const user = await prisma.user.findUnique({
        where: { email: registerDto.email.toLowerCase() },
      });
      expect(user.email).toBe(registerDto.email.toLowerCase());
    });

    it('should handle optional areaActivity', async () => {
      const registerDto = {
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'SecurePass123',
      };

      const result = (await service.register(registerDto)) as AuthenticationResponse;
      expect(result.user.areaActivity).toBeNull();
    });
  });

  describe('login', () => {
    it('should login successfully and return professional response', async () => {
      const email = `login${Date.now()}@example.com`;
      const password = 'SecurePass123';
      await TestHelpers.createUser({ email, password });

      const loginDto = {
        email,
        password,
      };

      const result = (await service.login(
        loginDto,
        '192.168.1.2',
        'Mozilla/5.0',
      )) as AuthenticationResponse;

      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(email.toLowerCase());
      expect(result).toHaveProperty('account');
      expect(result).toHaveProperty('session');
      expect(result.session.ipAddress).toBe('192.168.1.2');
    });

    it('should detect first login correctly', async () => {
      const email = `firstlogin${Date.now()}@example.com`;
      const password = 'SecurePass123';
      await TestHelpers.createUser({ email, password });

      const loginDto = {
        email,
        password,
      };

      // First login should have firstLogin = true
      const firstResult = (await service.login(loginDto)) as AuthenticationResponse;
      expect(firstResult.account.firstLogin).toBe(true);

      // Second login should have firstLogin = false
      const secondResult = (await service.login(loginDto)) as AuthenticationResponse;
      expect(secondResult.account.firstLogin).toBe(false);
    });

    it('should throw UnauthorizedException with error code for invalid password', async () => {
      const email = `test${Date.now()}@example.com`;
      await TestHelpers.createUser({ email, password: 'CorrectPass123' });

      const loginDto = {
        email,
        password: 'WrongPass123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      try {
        await service.login(loginDto);
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'INVALID_CREDENTIALS');
      }
    });

    it('should throw UnauthorizedException with error code if user is disabled', async () => {
      const email = `disabled${Date.now()}@example.com`;
      await TestHelpers.createUser({ email, enabled: false });

      const loginDto = {
        email,
        password: 'SecurePass123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      try {
        await service.login(loginDto);
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'ACCOUNT_DISABLED');
      }
    });

    it('should throw UnauthorizedException with error code if user does not exist', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);

      try {
        await service.login(loginDto);
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'INVALID_CREDENTIALS');
      }
    });

    it('should normalize email to lowercase on login', async () => {
      const email = `test${Date.now()}@example.com`;
      await TestHelpers.createUser({ email, password: 'SecurePass123' });

      const loginDto = {
        email: email.toUpperCase(),
        password: 'SecurePass123',
      };

      const result = (await service.login(loginDto)) as AuthenticationResponse;
      expect(result.user.email).toBe(email.toLowerCase());
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully and return professional response', async () => {
      const user = await TestHelpers.createUser();
      const loginResult = (await service.login({
        email: user.email,
        password: 'SecurePass123',
      })) as AuthenticationResponse;

      const refreshTokenDto = {
        refreshToken: loginResult.tokens.refreshToken,
      };

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = (await service.refreshToken(
        refreshTokenDto,
        '192.168.1.3',
      )) as AuthenticationResponse;

      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      // Refresh token should definitely be different (UUID)
      expect(result.tokens.refreshToken).not.toBe(loginResult.tokens.refreshToken);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('account');
      expect(result).toHaveProperty('session');
    });

    it('should invalidate old refresh token after use', async () => {
      const user = await TestHelpers.createUser();
      const loginResult = (await service.login({
        email: user.email,
        password: 'SecurePass123',
      })) as AuthenticationResponse;

      const refreshTokenDto = {
        refreshToken: loginResult.tokens.refreshToken,
      };

      await service.refreshToken(refreshTokenDto);

      // Try to use the same refresh token again
      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException with error code for invalid refresh token', async () => {
      const refreshTokenDto = {
        refreshToken: 'invalid-token',
      };

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await service.refreshToken(refreshTokenDto);
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'INVALID_REFRESH_TOKEN');
      }
    });

    it('should throw UnauthorizedException with error code for expired refresh token', async () => {
      const user = await TestHelpers.createUser();
      const loginResult = (await service.login({
        email: user.email,
        password: 'SecurePass123',
      })) as AuthenticationResponse;

      // Manually expire the token
      await prisma.refreshToken.updateMany({
        where: { token: loginResult.tokens.refreshToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const refreshTokenDto = {
        refreshToken: loginResult.tokens.refreshToken,
      };

      // First call should detect expiration and delete token
      try {
        await service.refreshToken(refreshTokenDto);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'REFRESH_TOKEN_EXPIRED');
      }

      // Second call should fail because token was deleted
      try {
        await service.refreshToken(refreshTokenDto);
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'INVALID_REFRESH_TOKEN');
      }
    });

    it('should throw UnauthorizedException if user is disabled', async () => {
      const user = await TestHelpers.createUser({ enabled: true });
      const loginResult = (await service.login({
        email: user.email,
        password: 'SecurePass123',
      })) as AuthenticationResponse;

      // Disable user
      await prisma.user.update({
        where: { id: user.id },
        data: { enabled: false },
      });

      const refreshTokenDto = {
        refreshToken: loginResult.tokens.refreshToken,
      };

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(
        UnauthorizedException,
      );

      try {
        await service.refreshToken(refreshTokenDto);
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'ACCOUNT_DISABLED');
      }
    });
  });

  describe('forgotPassword', () => {
    it('should return success message even if user does not exist', async () => {
      const forgotPasswordDto = {
        email: 'nonexistent@example.com',
        urlCallback: 'https://example.com/reset',
      };

      const result = await service.forgotPassword(forgotPasswordDto);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('password reset link has been sent');
    });

    it('should return success message if user exists', async () => {
      const email = `forgot${Date.now()}@example.com`;
      await TestHelpers.createUser({ email });

      const forgotPasswordDto = {
        email,
        urlCallback: 'https://example.com/reset',
      };

      const result = await service.forgotPassword(forgotPasswordDto);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('password reset link has been sent');
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      const user = await TestHelpers.createUser({ password: 'OldPass123' });

      const updatePasswordDto = {
        currentPassword: 'OldPass123',
        newPassword: 'NewSecurePass123',
        confirmNewPassword: 'NewSecurePass123',
      };

      const result = await service.updatePassword(user.id, updatePasswordDto);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Password updated successfully');

      // Verify password was changed
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true },
      });

      const isNewPasswordValid = await bcrypt.compare(
        'NewSecurePass123',
        updatedUser.password,
      );
      expect(isNewPasswordValid).toBe(true);

      // Verify all refresh tokens were invalidated
      const tokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(tokens).toHaveLength(0);
    });

    it('should throw BadRequestException if passwords do not match', async () => {
      const user = await TestHelpers.createUser();

      const updatePasswordDto = {
        currentPassword: 'SecurePass123',
        newPassword: 'NewSecurePass123',
        confirmNewPassword: 'DifferentPass123',
      };

      await expect(
        service.updatePassword(user.id, updatePasswordDto),
      ).rejects.toThrow(BadRequestException);

      try {
        await service.updatePassword(user.id, updatePasswordDto);
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'PASSWORDS_DO_NOT_MATCH');
      }
    });

    it('should throw UnauthorizedException if current password is incorrect', async () => {
      const user = await TestHelpers.createUser({ password: 'CorrectPass123' });

      const updatePasswordDto = {
        currentPassword: 'WrongPass123',
        newPassword: 'NewSecurePass123',
        confirmNewPassword: 'NewSecurePass123',
      };

      await expect(
        service.updatePassword(user.id, updatePasswordDto),
      ).rejects.toThrow(UnauthorizedException);

      try {
        await service.updatePassword(user.id, updatePasswordDto);
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'INVALID_CURRENT_PASSWORD');
      }
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const updatePasswordDto = {
        currentPassword: 'SecurePass123',
        newPassword: 'NewSecurePass123',
        confirmNewPassword: 'NewSecurePass123',
      };

      await expect(
        service.updatePassword('non-existent-id', updatePasswordDto),
      ).rejects.toThrow(NotFoundException);

      try {
        await service.updatePassword('non-existent-id', updatePasswordDto);
      } catch (error) {
        expect(error.response).toHaveProperty('code', 'USER_NOT_FOUND');
      }
    });
  });

  describe('logout', () => {
    it('should delete all refresh tokens for user', async () => {
      const user = await TestHelpers.createUser();
      await service.login({
        email: user.email,
        password: 'SecurePass123',
      });

      // Create additional refresh tokens
      await prisma.refreshToken.createMany({
        data: [
          {
            token: 'token1',
            userId: user.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
          {
            token: 'token2',
            userId: user.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
        ],
      });

      const result = await service.logout(user.id);
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('Logged out successfully');

      const tokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });

      expect(tokens).toHaveLength(0);
    });
  });
});
