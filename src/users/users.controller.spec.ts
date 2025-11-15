import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';

describe('UsersController', () => {
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

    // Create user and login for authenticated tests
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

  describe('GET /api/users/me', () => {
    it('should return current user profile', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).not.toHaveProperty('password');
          expect(res.body).toHaveProperty('metrics');
        });
    });

    it('should return 401 without authentication', () => {
      return request(app.getHttpServer()).get('/api/users/me').expect(401);
    });
  });

  describe('GET /api/users', () => {
    it('should return list of users', async () => {
      await TestHelpers.createUser({ name: 'User 1' });
      await TestHelpers.createUser({ name: 'User 2' });

      return request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should filter users by search term', async () => {
      await TestHelpers.createUser({
        name: 'John Doe',
        email: 'john@example.com',
      });
      await TestHelpers.createUser({
        name: 'Jane Smith',
        email: 'jane@example.com',
      });

      return request(app.getHttpServer())
        .get('/api/users?search=John')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.some((u: any) => u.name.includes('John'))).toBe(true);
        });
    });
  });

  describe('GET /api/users/:id/public', () => {
    it('should return public user profile', async () => {
      const user = await TestHelpers.createUser();

      return request(app.getHttpServer())
        .get(`/api/users/${user.id}/public`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', user.id);
          expect(res.body).not.toHaveProperty('password');
          expect(res.body).not.toHaveProperty('email');
        });
    });

    it('should return 404 if user not found', () => {
      return request(app.getHttpServer())
        .get('/api/users/invalid-id/public')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update user profile', () => {
      return request(app.getHttpServer())
        .put('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          bio: 'Updated bio',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.bio).toBe('Updated bio');
        });
    });
  });

  describe('POST /api/users/follow/:id', () => {
    it('should follow a user', async () => {
      const userToFollow = await TestHelpers.createUser();

      return request(app.getHttpServer())
        .post(`/api/users/follow/${userToFollow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);
    });

    it('should return 400 if trying to follow self', () => {
      return request(app.getHttpServer())
        .post(`/api/users/follow/${userId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('DELETE /api/users/unfollow/:id', () => {
    it('should unfollow a user', async () => {
      const userToFollow = await TestHelpers.createUser();

      // First follow
      await request(app.getHttpServer())
        .post(`/api/users/follow/${userToFollow.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Then unfollow
      return request(app.getHttpServer())
        .delete(`/api/users/unfollow/${userToFollow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('GET /api/users/followed', () => {
    it('should return list of followed users', async () => {
      const userToFollow = await TestHelpers.createUser();

      await request(app.getHttpServer())
        .post(`/api/users/follow/${userToFollow.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      return request(app.getHttpServer())
        .get('/api/users/followed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.some((u: any) => u.id === userToFollow.id)).toBe(
            true,
          );
        });
    });
  });

  describe('GET /api/users/followers', () => {
    it('should return list of followers', async () => {
      const follower = await TestHelpers.createUser();
      const followerToken = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: follower.email,
          password: 'password123',
        })
        .then((res) => res.body.jwtToken);

      await request(app.getHttpServer())
        .post(`/api/users/follow/${userId}`)
        .set('Authorization', `Bearer ${followerToken}`);

      return request(app.getHttpServer())
        .get('/api/users/followers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.some((u: any) => u.id === follower.id)).toBe(true);
        });
    });
  });
});
