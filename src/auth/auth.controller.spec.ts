import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';

describe('AuthController', () => {
  let app: INestApplication;
  let controller: AuthController;
  let service: AuthService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    controller = moduleFixture.get<AuthController>(AuthController);
    service = moduleFixture.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await app.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user and return professional response structure', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: `john${Date.now()}@example.com`,
          password: 'SecurePass123',
          areaActivity: 'Photography',
        })
        .expect(201);

      // Verify professional response structure
      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.tokens).toHaveProperty('tokenType', 'Bearer');
      expect(response.body.tokens).toHaveProperty('expiresIn');
      expect(response.body.tokens).toHaveProperty('expiresAt');

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('name', 'John Doe');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('role', 'USER');

      expect(response.body).toHaveProperty('account');
      expect(response.body.account).toHaveProperty('status', 'ACTIVE');
      expect(response.body.account).toHaveProperty('enabled', true);
      expect(response.body.account).toHaveProperty('firstLogin', true);

      expect(response.body).toHaveProperty('session');
      expect(response.body.session).toHaveProperty('authenticatedAt');
      expect(response.body.session).toHaveProperty('ipAddress');
    });

    it('should return 400 with error code if email already exists', async () => {
      const email = `test${Date.now()}@example.com`;
      await TestHelpers.createUser({ email });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email,
          password: 'SecurePass123',
          areaActivity: 'Photography',
        })
        .expect(400);

      expect(response.body).toHaveProperty('code', 'EMAIL_ALREADY_REGISTERED');
    });

    it('should return 422 if validation fails', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'J', // Too short
          email: 'invalid-email', // Invalid email
          password: '123', // Too short and doesn't meet requirements
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should return 422 if password does not meet requirements', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: `test${Date.now()}@example.com`,
          password: 'weak', // No uppercase, no number
        })
        .expect(422);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Password must contain'),
        ]),
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully and return professional response', async () => {
      const user = await TestHelpers.createUser({
        email: `login${Date.now()}@example.com`,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(user.email.toLowerCase());
      expect(response.body).toHaveProperty('account');
      expect(response.body).toHaveProperty('session');
    });

    it('should return 401 with error code for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should return 422 if validation fails', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token successfully and return professional response', async () => {
      const user = await TestHelpers.createUser();
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123',
        });

      const refreshToken = loginResponse.body.tokens.refreshToken;

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('tokens');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      expect(response.body.tokens.accessToken).not.toBe(
        loginResponse.body.tokens.accessToken,
      );
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('account');
      expect(response.body).toHaveProperty('session');
    });

    it('should return 401 with error code for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('code');
      expect(['INVALID_REFRESH_TOKEN', 'REFRESH_TOKEN_EXPIRED']).toContain(
        response.body.code,
      );
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return success message', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com',
          urlCallback: 'https://example.com/reset',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should return 422 if validation fails', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({
          email: 'invalid-email',
          urlCallback: 'not-a-url',
        })
        .expect(422);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/auth/update-password', () => {
    it('should update password successfully', async () => {
      const user = await TestHelpers.createUser({ password: 'OldPass123' });
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'OldPass123',
        });

      const token = loginResponse.body.tokens.accessToken;

      const response = await request(app.getHttpServer())
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'OldPass123',
          newPassword: 'NewSecurePass123',
          confirmNewPassword: 'NewSecurePass123',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Password updated successfully');
    });

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .put('/api/auth/update-password')
        .send({
          currentPassword: 'OldPass123',
          newPassword: 'NewSecurePass123',
          confirmNewPassword: 'NewSecurePass123',
        })
        .expect(401);
    });

    it('should return 400 if passwords do not match', async () => {
      const user = await TestHelpers.createUser();
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123',
        });

      const token = loginResponse.body.tokens.accessToken;

      const response = await request(app.getHttpServer())
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'SecurePass123',
          newPassword: 'NewSecurePass123',
          confirmNewPassword: 'DifferentPass123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('code', 'PASSWORDS_DO_NOT_MATCH');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await TestHelpers.createUser();
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123',
        });

      const token = loginResponse.body.tokens.accessToken;

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Logged out successfully');
    });

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);
    });
  });
});
