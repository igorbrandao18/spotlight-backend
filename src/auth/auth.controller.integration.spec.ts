import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { TestHelpers } from '../../test/helpers/test-helpers';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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

  describe('POST /api/auth/register', () => {
    it('should register a new user with professional response structure', async () => {
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

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: response.body.user.email },
      });
      expect(user).toBeDefined();
      expect(user.name).toBe('John Doe');

      // Verify user preferences were created
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: user.id },
      });
      expect(preferences).toBeDefined();
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
      expect(response.body).toHaveProperty('message');
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

    it('should normalize email to lowercase', async () => {
      const email = `TEST${Date.now()}@EXAMPLE.COM`;
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email,
          password: 'SecurePass123',
        })
        .expect(201);

      expect(response.body.user.email).toBe(email.toLowerCase());

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      expect(user).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with professional response', async () => {
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
      expect(response.body.account.firstLogin).toBe(true);
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

    it('should return 401 with error code for disabled account', async () => {
      const user = await TestHelpers.createUser({
        email: `disabled${Date.now()}@example.com`,
        enabled: false,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('code', 'ACCOUNT_DISABLED');
    });

    it('should normalize email to lowercase on login', async () => {
      const email = `test${Date.now()}@example.com`;
      await TestHelpers.createUser({ email, password: 'SecurePass123' });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: email.toUpperCase(),
          password: 'SecurePass123',
        })
        .expect(200);

      expect(response.body.user.email).toBe(email.toLowerCase());
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token successfully with professional response', async () => {
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

      // Verify old token was invalidated
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);
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
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('tokens');
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

      // Verify refresh tokens were invalidated
      const tokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(tokens).toHaveLength(0);
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
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully and invalidate tokens', async () => {
      const user = await TestHelpers.createUser();
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('tokens');
      const token = loginResponse.body.tokens.accessToken;
      const refreshToken = loginResponse.body.tokens.refreshToken;

      // Verify tokens exist before logout
      const tokensBefore = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(tokensBefore.length).toBeGreaterThan(0);

      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Logged out successfully');

      // Verify tokens were deleted
      const tokensAfter = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(tokensAfter).toHaveLength(0);
    });

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(401);
    });
  });
});
