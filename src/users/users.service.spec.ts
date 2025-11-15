import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await module.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();
  });

  describe('getMe', () => {
    it('should return user profile without password', async () => {
      const user = await TestHelpers.createUser();

      const result = await service.getMe(user.id);

      expect(result).not.toHaveProperty('password');
      expect(result).toHaveProperty('id', user.id);
      expect(result).toHaveProperty('email', user.email);
      expect(result).toHaveProperty('metrics');
    });

    it('should throw NotFoundException if user not found', async () => {
      await expect(service.getMe('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should include metrics in response', async () => {
      const user = await TestHelpers.createUser();
      const follower = await TestHelpers.createUser();

      // Create follow relationship
      await prisma.follow.create({
        data: {
          followerId: follower.id,
          followingId: user.id,
        },
      });

      const result = await service.getMe(user.id);

      expect(result.metrics).toBeDefined();
      expect(result.metrics.followers).toBeGreaterThanOrEqual(1);
    });
  });

  describe('findAll', () => {
    it('should return list of users', async () => {
      await TestHelpers.createUser({ name: 'User 1' });
      await TestHelpers.createUser({ name: 'User 2' });

      const result = await service.findAll({});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter users by search term', async () => {
      await TestHelpers.createUser({ name: 'John Doe', email: 'john@example.com' });
      await TestHelpers.createUser({ name: 'Jane Smith', email: 'jane@example.com' });

      const result = await service.findAll({ search: 'John' });

      expect(result.some((u) => u.name.includes('John'))).toBe(true);
    });
  });

  describe('findOnePublic', () => {
    it('should return public user profile', async () => {
      const user = await TestHelpers.createUser();

      const result = await service.findOnePublic(user.id);

      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('email');
      expect(result).toHaveProperty('id', user.id);
    });

    it('should throw NotFoundException if user not found', async () => {
      await expect(service.findOnePublic('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('followUser', () => {
    it('should create follow relationship', async () => {
      const follower = await TestHelpers.createUser();
      const following = await TestHelpers.createUser();

      await service.followUser(follower.id, following.id);

      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: follower.id,
            followingId: following.id,
          },
        },
      });

      expect(follow).toBeDefined();
    });

    it('should throw BadRequestException if trying to follow self', async () => {
      const user = await TestHelpers.createUser();

      await expect(service.followUser(user.id, user.id)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if already following', async () => {
      const follower = await TestHelpers.createUser();
      const following = await TestHelpers.createUser();

      await service.followUser(follower.id, following.id);

      await expect(service.followUser(follower.id, following.id)).rejects.toThrow(BadRequestException);
    });
  });

  describe('unfollowUser', () => {
    it('should remove follow relationship', async () => {
      const follower = await TestHelpers.createUser();
      const following = await TestHelpers.createUser();

      await service.followUser(follower.id, following.id);
      await service.unfollowUser(follower.id, following.id);

      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: follower.id,
            followingId: following.id,
          },
        },
      });

      expect(follow).toBeNull();
    });
  });

  describe('getFollowed', () => {
    it('should return list of followed users', async () => {
      const user = await TestHelpers.createUser();
      const followed1 = await TestHelpers.createUser();
      const followed2 = await TestHelpers.createUser();

      await service.followUser(user.id, followed1.id);
      await service.followUser(user.id, followed2.id);

      const result = await service.getFollowed(user.id);

      expect(result.length).toBe(2);
      expect(result.some((u) => u.id === followed1.id)).toBe(true);
      expect(result.some((u) => u.id === followed2.id)).toBe(true);
    });
  });

  describe('getFollowers', () => {
    it('should return list of followers', async () => {
      const user = await TestHelpers.createUser();
      const follower1 = await TestHelpers.createUser();
      const follower2 = await TestHelpers.createUser();

      await service.followUser(follower1.id, user.id);
      await service.followUser(follower2.id, user.id);

      const result = await service.getFollowers(user.id);

      expect(result.length).toBe(2);
      expect(result.some((u) => u.id === follower1.id)).toBe(true);
      expect(result.some((u) => u.id === follower2.id)).toBe(true);
    });
  });
});
