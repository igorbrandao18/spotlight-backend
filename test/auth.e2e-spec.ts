import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelpers } from './helpers/test-helpers';

describe('Auth E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

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
  });

  describe('Complete Auth Flow', () => {
    it('should complete full authentication flow', async () => {
      const email = `e2e${Date.now()}@example.com`;
      const password = 'password123';

      // 1. Register
      const registerResponse = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'E2E Test User',
          email,
          password,
          areaActivity: 'Photography',
        })
        .expect(201);

      expect(registerResponse.body).toHaveProperty('jwtToken');
      expect(registerResponse.body).toHaveProperty('refreshToken');
      authToken = registerResponse.body.jwtToken;
      userId = registerResponse.body.userId;

      // 2. Access protected resource
      const meResponse = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(meResponse.body.email).toBe(email);

      // 3. Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: registerResponse.body.refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('jwtToken');
      const newToken = refreshResponse.body.jwtToken;

      // 4. Use new token
      await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      // 5. Update password
      await request(app.getHttpServer())
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          currentPassword: password,
          newPassword: 'newpassword123',
          confirmNewPassword: 'newpassword123',
        })
        .expect(200);

      // 6. Login with new password
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'newpassword123',
        })
        .expect(200);

      // 7. Logout
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle password reset flow', async () => {
      const email = `reset${Date.now()}@example.com`;
      await TestHelpers.createUser({ email });

      // Request password reset
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({
          email,
          urlCallback: 'http://localhost:3000/reset',
        })
        .expect(200);

      // Note: In a real scenario, you would extract the token from email
      // For now, we're just testing the endpoint exists and responds
    });
  });
});
