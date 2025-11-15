import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import * as bcrypt from 'bcrypt';

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
    it('should register a new user successfully', async () => {
      const registerDto = {
        name: 'John Doe',
        email: `john${Date.now()}@example.com`,
        password: 'password123',
        areaActivity: 'Photography',
      };

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('jwtToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('userId');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: registerDto.email },
      });
      expect(user).toBeDefined();
      expect(user.name).toBe(registerDto.name);
      expect(user.email).toBe(registerDto.email);
    });

    it('should throw BadRequestException if email already exists', async () => {
      const email = `existing${Date.now()}@example.com`;
      await TestHelpers.createUser({ email });

      const registerDto = {
        name: 'Another User',
        email,
        password: 'password123',
        areaActivity: 'Photography',
      };

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });

    it('should hash password before storing', async () => {
      const registerDto = {
        name: 'Test User',
        email: `test${Date.now()}@example.com`,
        password: 'password123',
        areaActivity: 'Photography',
      };

      const result = await service.register(registerDto);
      expect(result).toHaveProperty('jwtToken');

      const user = await prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      expect(user).toBeDefined();
      expect(user.password).not.toBe(registerDto.password);
      const isPasswordHashed = await bcrypt.compare(registerDto.password, user.password);
      expect(isPasswordHashed).toBe(true);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const email = `login${Date.now()}@example.com`;
      const password = 'password123';
      await TestHelpers.createUser({ email, password });

      const loginDto = {
        email,
        password,
      };

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('jwtToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('userId');
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const email = `test${Date.now()}@example.com`;
      await TestHelpers.createUser({ email, password: 'correctpassword' });

      const loginDto = {
        email,
        password: 'wrongpassword',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is disabled', async () => {
      const email = `disabled${Date.now()}@example.com`;
      await TestHelpers.createUser({ email, enabled: false });

      const loginDto = {
        email,
        password: 'password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user does not exist', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const user = await TestHelpers.createUser();
      const loginResult = await service.login({
        email: user.email,
        password: 'password123',
      });

      const refreshTokenDto = {
        refreshToken: loginResult.refreshToken,
      };

      const result = await service.refreshToken(refreshTokenDto);

      expect(result).toHaveProperty('jwtToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.jwtToken).not.toBe(loginResult.jwtToken);
    });

    it('should throw UnauthorizedException with invalid refresh token', async () => {
      const refreshTokenDto = {
        refreshToken: 'invalid-token',
      };

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with expired refresh token', async () => {
      const user = await TestHelpers.createUser();
      const loginResult = await service.login({
        email: user.email,
        password: 'password123',
      });

      // Manually expire the token
      await prisma.refreshToken.updateMany({
        where: { token: loginResult.refreshToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const refreshTokenDto = {
        refreshToken: loginResult.refreshToken,
      };

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete all refresh tokens for user', async () => {
      const user = await TestHelpers.createUser();
      await service.login({
        email: user.email,
        password: 'password123',
      });

      // Create multiple refresh tokens
      await prisma.refreshToken.createMany({
        data: [
          { token: 'token1', userId: user.id, expiresAt: new Date(Date.now() + 86400000) },
          { token: 'token2', userId: user.id, expiresAt: new Date(Date.now() + 86400000) },
        ],
      });

      await service.logout(user.id);

      const tokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });

      expect(tokens).toHaveLength(0);
    });
  });
});
