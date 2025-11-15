import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { NotFoundException } from '@nestjs/common';

describe('PostsService', () => {
  let service: PostsService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<PostsService>(PostsService);
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
    it('should create a post', async () => {
      const user = await TestHelpers.createUser();

      const createPostDto = {
        content: 'Test post content',
        description: 'Test description',
      };

      const result = await service.create(user.id, createPostDto);

      expect(result).toHaveProperty('id');
      expect(result.content).toBe(createPostDto.content);

      const post = await prisma.post.findUnique({
        where: { id: result.id },
      });
      expect(post).toBeDefined();
      expect(post.authorId).toBe(user.id);
    });
  });

  describe('findAll', () => {
    it('should return list of posts', async () => {
      const user = await TestHelpers.createUser();
      await TestHelpers.createPost(user.id);
      await TestHelpers.createPost(user.id);

      const result = await service.findAll({});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return a post by id', async () => {
      const user = await TestHelpers.createUser();
      const post = await TestHelpers.createPost(user.id);

      const result = await service.findOne(post.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(post.id);
    });

    it('should throw NotFoundException if post not found', async () => {
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a post', async () => {
      const user = await TestHelpers.createUser();
      const post = await TestHelpers.createPost(user.id);

      const updateDto = {
        content: 'Updated content',
      };

      const result = await service.update(user.id, post.id, updateDto);

      expect(result.content).toBe(updateDto.content);

      const updatedPost = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(updatedPost.content).toBe(updateDto.content);
    });

    it('should throw NotFoundException if post not found', async () => {
      const user = await TestHelpers.createUser();

      await expect(
        service.update(user.id, 'invalid-id', { content: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not author', async () => {
      const author = await TestHelpers.createUser();
      const otherUser = await TestHelpers.createUser();
      const post = await TestHelpers.createPost(author.id);

      await expect(
        service.update(otherUser.id, post.id, { content: 'test' }),
      ).rejects.toThrow('ForbiddenException');
    });
  });

  describe('remove', () => {
    it('should delete a post', async () => {
      const user = await TestHelpers.createUser();
      const post = await TestHelpers.createPost(user.id);

      await service.remove(user.id, post.id);

      const deletedPost = await prisma.post.findUnique({
        where: { id: post.id },
      });
      expect(deletedPost).toBeNull();
    });

    it('should throw ForbiddenException if user is not author', async () => {
      const author = await TestHelpers.createUser();
      const otherUser = await TestHelpers.createUser();
      const post = await TestHelpers.createPost(author.id);

      await expect(service.remove(otherUser.id, post.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('createComment', () => {
    it('should create a comment on post', async () => {
      const author = await TestHelpers.createUser();
      const commenter = await TestHelpers.createUser();
      const post = await TestHelpers.createPost(author.id);

      const commentDto = {
        content: 'This is a comment',
      };

      const result = await service.createComment(
        commenter.id,
        post.id,
        commentDto,
      );

      expect(result).toHaveProperty('id');
      expect(result.content).toBe(commentDto.content);

      const comment = await prisma.postComment.findUnique({
        where: { id: result.id },
      });
      expect(comment).toBeDefined();
      expect(comment.postId).toBe(post.id);
      expect(comment.authorId).toBe(commenter.id);
    });

    it('should create nested comment', async () => {
      const author = await TestHelpers.createUser();
      const commenter = await TestHelpers.createUser();
      const post = await TestHelpers.createPost(author.id);

      const parentComment = await prisma.postComment.create({
        data: {
          content: 'Parent comment',
          postId: post.id,
          authorId: commenter.id,
        },
      });

      const commentDto = {
        content: 'Reply comment',
        parentId: parentComment.id,
      };

      const result = await service.createComment(
        commenter.id,
        post.id,
        commentDto,
      );

      expect(result.parentId).toBe(parentComment.id);
    });
  });

  describe('createReaction', () => {
    it('should create a reaction on post', async () => {
      const author = await TestHelpers.createUser();
      const reactor = await TestHelpers.createUser();
      const post = await TestHelpers.createPost(author.id);

      const reactionDto = {
        type: 'LIKE',
      };

      const result = await service.createReaction(
        reactor.id,
        post.id,
        reactionDto,
      );

      expect(result).toHaveProperty('type', 'LIKE');

      const reaction = await prisma.postReaction.findUnique({
        where: {
          userId_postId: {
            userId: reactor.id,
            postId: post.id,
          },
        },
      });
      expect(reaction).toBeDefined();
    });

    it('should update reaction if already exists', async () => {
      const author = await TestHelpers.createUser();
      const reactor = await TestHelpers.createUser();
      const post = await TestHelpers.createPost(author.id);

      await service.createReaction(reactor.id, post.id, { type: 'LIKE' });
      const result = await service.createReaction(reactor.id, post.id, {
        type: 'LOVE',
      });

      expect(result.type).toBe('LOVE');
    });
  });
});
