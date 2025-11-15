import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    follow: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    socialLink: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    website: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    location: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    availability: {
      upsert: jest.fn(),
    },
    rate: {
      upsert: jest.fn(),
    },
    userPreferences: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('should return user profile without password', async () => {
      const userId = '1';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashed',
        socialLinks: [],
        websites: [],
        locations: [],
        availability: null,
        rates: null,
        preferences: null,
        _count: {
          followers: 10,
          following: 5,
          ownedProjects: 3,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe(userId);

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('metrics');
      expect(result.metrics.followers).toBe(10);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('followUser', () => {
    it('should create follow relationship', async () => {
      const followerId = '1';
      const followingId = '2';

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: followingId,
        enabled: true,
      });
      mockPrismaService.follow.findUnique.mockResolvedValue(null);
      mockPrismaService.follow.create.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: followingId,
        email: 'following@example.com',
        name: 'Following User',
      });

      await service.followUser(followerId, followingId);

      expect(mockPrismaService.follow.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if trying to follow self', async () => {
      await expect(service.followUser('1', '1')).rejects.toThrow();
    });
  });
});

