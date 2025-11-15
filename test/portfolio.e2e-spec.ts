import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelpers } from './helpers/test-helpers';

describe('Portfolio E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let itemId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);

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

  describe('Complete Portfolio Flow', () => {
    it('should complete full portfolio item flow', async () => {
      // 1. Create portfolio item
      const createResponse = await request(app.getHttpServer())
        .post('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Portfolio Item',
          description: 'Test description',
          category: 'PHOTOGRAPHY',
        })
        .expect(201);

      itemId = createResponse.body.id;
      expect(createResponse.body.title).toBe('Portfolio Item');

      // 2. Get portfolio item
      const getResponse = await request(app.getHttpServer())
        .get(`/api/portfolio/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(getResponse.body.id).toBe(itemId);

      // 3. Update portfolio item
      const updateResponse = await request(app.getHttpServer())
        .put(`/api/portfolio/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
        })
        .expect(200);

      expect(updateResponse.body.title).toBe('Updated Title');

      // 4. Like item
      await request(app.getHttpServer())
        .post(`/api/portfolio/${itemId}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // 5. Get likes
      const likesResponse = await request(app.getHttpServer())
        .get(`/api/portfolio/${itemId}/likes`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(likesResponse.body)).toBe(true);
      expect(likesResponse.body.length).toBeGreaterThanOrEqual(1);

      // 6. Register view
      await request(app.getHttpServer())
        .post(`/api/portfolio/${itemId}/view`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // 7. Create comment
      const commentResponse = await request(app.getHttpServer())
        .post(`/api/comments/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'This is a comment',
        })
        .expect(201);

      expect(commentResponse.body.content).toBe('This is a comment');

      // 8. Get comments
      const commentsResponse = await request(app.getHttpServer())
        .get(`/api/comments/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 0, size: 10 })
        .expect(200);

      expect(Array.isArray(commentsResponse.body)).toBe(true);
      expect(commentsResponse.body.length).toBeGreaterThanOrEqual(1);

      // 9. List portfolio items
      const listResponse = await request(app.getHttpServer())
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ userId })
        .expect(200);

      expect(Array.isArray(listResponse.body)).toBe(true);
      expect(listResponse.body.some((item: any) => item.id === itemId)).toBe(true);

      // 10. Unlike item
      await request(app.getHttpServer())
        .post(`/api/portfolio/${itemId}/unlike`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 11. Delete portfolio item
      await request(app.getHttpServer())
        .delete(`/api/portfolio/${itemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});

