import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '1h',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        areaActivity: 'Photography',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: '1',
        ...registerDto,
        password: 'hashed',
      });
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        token: 'refresh-token',
      });

      // Mock login call
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({
        id: '1',
        email: registerDto.email,
        password: await bcrypt.hash(registerDto.password, 10),
        enabled: true,
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('jwtToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('userId');
    });

    it('should throw BadRequestException if email already exists', async () => {
      const registerDto = {
        name: 'John Doe',
        email: 'existing@example.com',
        password: 'password123',
        areaActivity: 'Photography',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginDto.email,
        password: hashedPassword,
        enabled: true,
      });
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        token: 'refresh-token',
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('jwtToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('userId');
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginDto.email,
        password: hashedPassword,
        enabled: true,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is disabled', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: '1',
        email: loginDto.email,
        password: await bcrypt.hash(loginDto.password, 10),
        enabled: false,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: '1',
        token: refreshTokenDto.refreshToken,
        userId: '1',
        expiresAt,
        user: {
          id: '1',
          email: 'test@example.com',
        },
      });
      mockPrismaService.refreshToken.delete.mockResolvedValue({});
      mockJwtService.sign.mockReturnValue('new-jwt-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        token: 'new-refresh-token',
      });

      const result = await service.refreshToken(refreshTokenDto);

      expect(result).toHaveProperty('jwtToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with expired token', async () => {
      const refreshTokenDto = {
        refreshToken: 'expired-token',
      };

      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: '1',
        token: refreshTokenDto.refreshToken,
        userId: '1',
        expiresAt: expiredDate,
      });

      await expect(service.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete all refresh tokens for user', async () => {
      const userId = '1';
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

      await service.logout(userId);

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
    });
  });
});

