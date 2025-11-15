import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelpers } from './helpers/test-helpers';

describe('Posts E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let postId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await app.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();

    // Create user and login
    const user = await TestHelpers.createUser();
    userId = user.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'password123',
      });

    authToken = loginResponse.body.jwtToken;
  });

  describe('POST /api/posts', () => {
    it('should create a post', () => {
      return request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a test post',
          description: 'Test description',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.content).toBe('This is a test post');
          postId = res.body.id;
        });
    });
  });

  describe('GET /api/posts', () => {
    it('should list posts', async () => {
      await TestHelpers.createPost(userId);

      return request(app.getHttpServer())
        .get('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('POST /api/posts/:id/comments', () => {
    it('should create a comment on post', async () => {
      const post = await TestHelpers.createPost(userId);

      return request(app.getHttpServer())
        .post(`/api/posts/${post.id}/comments`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a comment',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.content).toBe('This is a comment');
        });
    });
  });

  describe('POST /api/posts/:id/reactions', () => {
    it('should add reaction to post', async () => {
      const post = await TestHelpers.createPost(userId);

      return request(app.getHttpServer())
        .post(`/api/posts/${post.id}/reactions`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'LIKE',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('type', 'LIKE');
        });
    });
  });
});
