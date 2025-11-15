import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('PortfolioService', () => {
  let service: PortfolioService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<PortfolioService>(PortfolioService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await module.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();
  });

  describe('create', () => {
    it('should create a portfolio item', async () => {
      const user = await TestHelpers.createUser();

      const createDto = {
        title: 'Portfolio Item',
        description: 'Test description',
      };

      const result = await service.create(user.id, createDto);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createDto.title);

      const item = await prisma.portfolioItem.findUnique({
        where: { id: result.id },
      });
      expect(item).toBeDefined();
      expect(item.userId).toBe(user.id);
    });
  });

  describe('findAll', () => {
    it('should return list of portfolio items', async () => {
      const user = await TestHelpers.createUser();

      await prisma.portfolioItem.create({
        data: {
          title: 'Item 1',
          userId: user.id,
        },
      });

      await prisma.portfolioItem.create({
        data: {
          title: 'Item 2',
          userId: user.id,
        },
      });

      const result = await service.findAll(user.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return a portfolio item by id', async () => {
      const user = await TestHelpers.createUser();
      const item = await prisma.portfolioItem.create({
        data: {
          title: 'Test Item',
          userId: user.id,
        },
      });

      const result = await service.findOne(item.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(item.id);
    });

    it('should throw NotFoundException if item not found', async () => {
      await expect(service.findOne('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a portfolio item', async () => {
      const user = await TestHelpers.createUser();
      const item = await prisma.portfolioItem.create({
        data: {
          title: 'Original Title',
          userId: user.id,
        },
      });

      const updateDto = {
        title: 'Updated Title',
      };

      const result = await service.update(user.id, item.id, updateDto);

      expect(result.title).toBe(updateDto.title);

      const updatedItem = await prisma.portfolioItem.findUnique({
        where: { id: item.id },
      });
      expect(updatedItem.title).toBe(updateDto.title);
    });

    it('should throw ForbiddenException if user is not owner', async () => {
      const owner = await TestHelpers.createUser();
      const otherUser = await TestHelpers.createUser();
      const item = await prisma.portfolioItem.create({
        data: {
          title: 'Test Item',
          userId: owner.id,
        },
      });

      await expect(service.update(otherUser.id, item.id, { title: 'test' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('likeItem', () => {
    it('should like a portfolio item', async () => {
      const owner = await TestHelpers.createUser();
      const liker = await TestHelpers.createUser();
      const item = await prisma.portfolioItem.create({
        data: {
          title: 'Test Item',
          userId: owner.id,
        },
      });

      await service.like(item.id, liker.id);

      const like = await prisma.portfolioLike.findUnique({
        where: {
          portfolioItemId_userId: {
            portfolioItemId: item.id,
            userId: liker.id,
          },
        },
      });

      expect(like).toBeDefined();
    });
  });

  describe('createComment', () => {
    it('should create a comment on portfolio item', async () => {
      const owner = await TestHelpers.createUser();
      const commenter = await TestHelpers.createUser();
      const item = await prisma.portfolioItem.create({
        data: {
          title: 'Test Item',
          userId: owner.id,
        },
      });

      const commentDto = {
        content: 'This is a comment',
      };

      const result = await service.createComment(item.id, commenter.id, commentDto);

      expect(result).toHaveProperty('id');
      expect(result.content).toBe(commentDto.content);

      const comment = await prisma.portfolioComment.findUnique({
        where: { id: result.id },
      });
      expect(comment).toBeDefined();
      expect(comment.itemId).toBe(item.id);
      expect(comment.authorId).toBe(commenter.id);
    });
  });
});

