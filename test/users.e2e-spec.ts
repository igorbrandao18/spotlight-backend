import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelpers } from './helpers/test-helpers';

describe('Users E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

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

  describe('Complete User Flow', () => {
    it('should complete full user profile flow', async () => {
      // 1. Get current user profile
      const meResponse = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(meResponse.body).toHaveProperty('id');
      expect(meResponse.body).not.toHaveProperty('password');

      // 2. Update profile
      const updateResponse = await request(app.getHttpServer())
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          bio: 'Updated bio',
          areaActivity: 'VIDEO',
        })
        .expect(200);

      expect(updateResponse.body.name).toBe('Updated Name');
      expect(updateResponse.body.bio).toBe('Updated bio');

      // 3. Search for users
      const searchResponse = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'Updated' })
        .expect(200);

      expect(Array.isArray(searchResponse.body)).toBe(true);
    });
  });

  describe('Follow/Unfollow Flow', () => {
    it('should complete follow/unfollow flow', async () => {
      const userToFollow = await TestHelpers.createUser();

      // 1. Follow user
      await request(app.getHttpServer())
        .post(`/api/users/follow/${userToFollow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      // 2. Get followed users
      const followedResponse = await request(app.getHttpServer())
        .get('/api/users/followed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(followedResponse.body.some((u: any) => u.id === userToFollow.id)).toBe(true);

      // 3. Get public profile
      const publicProfileResponse = await request(app.getHttpServer())
        .get(`/api/users/${userToFollow.id}/public`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(publicProfileResponse.body.id).toBe(userToFollow.id);
      expect(publicProfileResponse.body).not.toHaveProperty('email');

      // 4. Unfollow user
      await request(app.getHttpServer())
        .delete(`/api/users/unfollow/${userToFollow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // 5. Verify unfollowed
      const followedAfterUnfollow = await request(app.getHttpServer())
        .get('/api/users/followed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(followedAfterUnfollow.body.some((u: any) => u.id === userToFollow.id)).toBe(false);
    });
  });

  describe('Followers Flow', () => {
    it('should show followers correctly', async () => {
      const follower1 = await TestHelpers.createUser();
      const follower2 = await TestHelpers.createUser();

      // Get tokens for followers
      const token1 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: follower1.email, password: 'password123' })
        .then((res) => res.body.jwtToken);

      const token2 = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: follower2.email, password: 'password123' })
        .then((res) => res.body.jwtToken);

      // Both users follow the main user
      await request(app.getHttpServer())
        .post(`/api/users/follow/${userId}`)
        .set('Authorization', `Bearer ${token1}`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/users/follow/${userId}`)
        .set('Authorization', `Bearer ${token2}`)
        .expect(201);

      // Get followers
      const followersResponse = await request(app.getHttpServer())
        .get('/api/users/followers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(followersResponse.body.length).toBeGreaterThanOrEqual(2);
      expect(followersResponse.body.some((u: any) => u.id === follower1.id)).toBe(true);
      expect(followersResponse.body.some((u: any) => u.id === follower2.id)).toBe(true);
    });
  });
});

