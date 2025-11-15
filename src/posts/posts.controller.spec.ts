import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';

describe('PostsController', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await app.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();

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
        });
    });

    it('should return 400 if validation fails', () => {
      return request(app.getHttpServer())
        .post('/api/posts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: '', // Empty content should fail
        })
        .expect(400);
    });
  });

  describe('GET /api/posts', () => {
    it('should return list of posts', async () => {
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

  describe('GET /api/posts/:id', () => {
    it('should return a post by id', async () => {
      const post = await TestHelpers.createPost(userId);

      return request(app.getHttpServer())
        .get(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(post.id);
        });
    });

    it('should return 404 if post not found', () => {
      return request(app.getHttpServer())
        .get('/api/posts/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/posts/:id', () => {
    it('should update a post', async () => {
      const post = await TestHelpers.createPost(userId);

      return request(app.getHttpServer())
        .put(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated content',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.content).toBe('Updated content');
        });
    });

    it('should return 403 if user is not author', async () => {
      const otherUser = await TestHelpers.createUser();
      const post = await TestHelpers.createPost(otherUser.id);

      return request(app.getHttpServer())
        .put(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Updated content',
        })
        .expect(403);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete a post', async () => {
      const post = await TestHelpers.createPost(userId);

      return request(app.getHttpServer())
        .delete(`/api/posts/${post.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
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
          expect(res.body.type).toBe('LIKE');
        });
    });
  });
});
