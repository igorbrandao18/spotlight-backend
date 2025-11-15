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
  let refreshToken: string;
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

  describe('Complete Authentication Flow', () => {
    it('should complete full authentication flow with professional responses', async () => {
      const email = `e2e${Date.now()}@example.com`;
      const password = 'SecurePass123';

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

      // Verify professional response structure
      expect(registerResponse.body).toHaveProperty('tokens');
      expect(registerResponse.body.tokens).toHaveProperty('accessToken');
      expect(registerResponse.body.tokens).toHaveProperty('refreshToken');
      expect(registerResponse.body.tokens).toHaveProperty('tokenType', 'Bearer');
      expect(registerResponse.body).toHaveProperty('user');
      expect(registerResponse.body.user.email).toBe(email.toLowerCase());
      expect(registerResponse.body).toHaveProperty('account');
      expect(registerResponse.body.account.firstLogin).toBe(true);
      expect(registerResponse.body).toHaveProperty('session');

      authToken = registerResponse.body.tokens.accessToken;
      refreshToken = registerResponse.body.tokens.refreshToken;
      userId = registerResponse.body.user.id;

      // 2. Access protected resource with access token
      const meResponse = await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(meResponse.body.email).toBe(email.toLowerCase());

      // 3. Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: refreshToken })
        .expect(200);

      expect(refreshResponse.body).toHaveProperty('tokens');
      expect(refreshResponse.body.tokens).toHaveProperty('accessToken');
      expect(refreshResponse.body.tokens).toHaveProperty('refreshToken');
      expect(refreshResponse.body.tokens.accessToken).not.toBe(authToken);
      const newToken = refreshResponse.body.tokens.accessToken;
      const newRefreshToken = refreshResponse.body.tokens.refreshToken;

      // Verify old refresh token is invalidated
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: refreshToken })
        .expect(401);

      // 4. Use new token to access protected resource
      await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);

      // 5. Update password
      const updatePasswordResponse = await request(app.getHttpServer())
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          currentPassword: password,
          newPassword: 'NewSecurePass123',
          confirmNewPassword: 'NewSecurePass123',
        })
        .expect(200);

      expect(updatePasswordResponse.body).toHaveProperty('message');
      expect(updatePasswordResponse.body.message).toContain(
        'Password updated successfully',
      );

      // Verify all refresh tokens were invalidated after password change
      const tokensAfterPasswordChange = await prisma.refreshToken.findMany({
        where: { userId },
      });
      expect(tokensAfterPasswordChange).toHaveLength(0);

      // 6. Login with new password
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'NewSecurePass123',
        })
        .expect(200);

      expect(loginResponse.body).toHaveProperty('tokens');
      expect(loginResponse.body).toHaveProperty('user');
      expect(loginResponse.body.user.email).toBe(email.toLowerCase());
      expect(loginResponse.body.account.firstLogin).toBe(false); // Not first login anymore

      const finalToken = loginResponse.body.tokens.accessToken;
      const finalRefreshToken = loginResponse.body.tokens.refreshToken;

      // 7. Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${finalToken}`)
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('message');
      expect(logoutResponse.body.message).toContain('Logged out successfully');

      // Verify refresh tokens were deleted
      const tokensAfterLogout = await prisma.refreshToken.findMany({
        where: { userId },
      });
      expect(tokensAfterLogout).toHaveLength(0);

      // Verify refresh token no longer works
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: finalRefreshToken })
        .expect(401);
    });
  });

  describe('Registration Flow', () => {
    it('should register user and create default preferences', async () => {
      const email = `register${Date.now()}@example.com`;

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Registration Test',
          email,
          password: 'SecurePass123',
          areaActivity: 'Design',
        })
        .expect(201);

      expect(response.body.user.email).toBe(email.toLowerCase());

      // Verify user preferences were created
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        include: { preferences: true },
      });
      expect(user.preferences).toBeDefined();
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Weak Password User',
          email: `weak${Date.now()}@example.com`,
          password: 'weak', // Doesn't meet requirements
        })
        .expect(422);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Password must contain'),
        ]),
      );
    });

    it('should reject registration with duplicate email', async () => {
      const email = `duplicate${Date.now()}@example.com`;
      await TestHelpers.createUser({ email });

      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Duplicate User',
          email,
          password: 'SecurePass123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('code', 'EMAIL_ALREADY_REGISTERED');
    });
  });

  describe('Login Flow', () => {
    it('should login successfully and track first login', async () => {
      const email = `login${Date.now()}@example.com`;
      await TestHelpers.createUser({ email });

      // First login
      const firstLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'SecurePass123',
        })
        .expect(200);

      expect(firstLogin.body.account.firstLogin).toBe(true);

      // Second login
      const secondLogin = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'SecurePass123',
        })
        .expect(200);

      expect(secondLogin.body.account.firstLogin).toBe(false);
    });

    it('should reject login with invalid credentials', async () => {
      const email = `invalid${Date.now()}@example.com`;
      await TestHelpers.createUser({ email, password: 'CorrectPass123' });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'WrongPass123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('code', 'INVALID_CREDENTIALS');
    });

    it('should reject login for disabled account', async () => {
      const email = `disabled${Date.now()}@example.com`;
      await TestHelpers.createUser({
        email,
        enabled: false,
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password: 'SecurePass123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('code', 'ACCOUNT_DISABLED');
    });
  });

  describe('Password Reset Flow', () => {
    it('should handle password reset request', async () => {
      const email = `reset${Date.now()}@example.com`;
      await TestHelpers.createUser({ email });

      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({
          email,
          urlCallback: 'https://example.com/reset',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should return same message even if user does not exist (security)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
          urlCallback: 'https://example.com/reset',
        })
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('password reset link has been sent');
    });
  });

  describe('Token Refresh Flow', () => {
    it('should refresh token and invalidate old one', async () => {
      const user = await TestHelpers.createUser();
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123',
        })
        .expect(200);

      const oldRefreshToken = loginResponse.body.tokens.refreshToken;
      const oldAccessToken = loginResponse.body.tokens.accessToken;

      // Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: oldRefreshToken })
        .expect(200);

      expect(refreshResponse.body.tokens.accessToken).not.toBe(oldAccessToken);
      expect(refreshResponse.body.tokens.refreshToken).not.toBe(oldRefreshToken);

      // Old refresh token should be invalid
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: oldRefreshToken })
        .expect(401);

      // New refresh token should work
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: refreshResponse.body.tokens.refreshToken })
        .expect(200);
    });

    it('should reject expired refresh token', async () => {
      const user = await TestHelpers.createUser();
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123',
        })
        .expect(200);

      const refreshToken = loginResponse.body.tokens.refreshToken;

      // Manually expire the token
      await prisma.refreshToken.updateMany({
        where: { token: refreshToken },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);

      expect(response.body).toHaveProperty('code', 'REFRESH_TOKEN_EXPIRED');
    });
  });

  describe('Password Update Flow', () => {
    it('should update password and invalidate all tokens', async () => {
      const user = await TestHelpers.createUser({ password: 'OldPass123' });
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'OldPass123',
        })
        .expect(200);

      const token = loginResponse.body.tokens.accessToken;
      const refreshToken = loginResponse.body.tokens.refreshToken;

      // Create additional refresh tokens
      await prisma.refreshToken.createMany({
        data: [
          {
            token: 'extra-token-1',
            userId: user.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
          {
            token: 'extra-token-2',
            userId: user.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
        ],
      });

      // Update password
      await request(app.getHttpServer())
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'OldPass123',
          newPassword: 'NewSecurePass123',
          confirmNewPassword: 'NewSecurePass123',
        })
        .expect(200);

      // Verify all tokens were invalidated
      const tokens = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(tokens).toHaveLength(0);

      // Verify old access token no longer works
      await request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      // Verify refresh token no longer works
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);

      // Login with new password
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'NewSecurePass123',
        })
        .expect(200);
    });

    it('should reject password update if passwords do not match', async () => {
      const user = await TestHelpers.createUser();
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123',
        })
        .expect(200);

      const token = loginResponse.body.tokens.accessToken;

      const response = await request(app.getHttpServer())
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'password123',
          newPassword: 'NewSecurePass123',
          confirmNewPassword: 'DifferentPass123',
        })
        .expect(400);

      expect(response.body).toHaveProperty('code', 'PASSWORDS_DO_NOT_MATCH');
    });

    it('should reject password update with incorrect current password', async () => {
      const user = await TestHelpers.createUser({ password: 'CorrectPass123' });
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'CorrectPass123',
        })
        .expect(200);

      const token = loginResponse.body.tokens.accessToken;

      const response = await request(app.getHttpServer())
        .put('/api/auth/update-password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongPass123',
          newPassword: 'NewSecurePass123',
          confirmNewPassword: 'NewSecurePass123',
        })
        .expect(401);

      expect(response.body).toHaveProperty('code', 'INVALID_CURRENT_PASSWORD');
    });
  });

  describe('Logout Flow', () => {
    it('should logout and invalidate all refresh tokens', async () => {
      const user = await TestHelpers.createUser();
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'SecurePass123',
        })
        .expect(200);

      const token = loginResponse.body.tokens.accessToken;
      const refreshToken = loginResponse.body.tokens.refreshToken;

      // Create additional refresh tokens
      await prisma.refreshToken.createMany({
        data: [
          {
            token: 'token-1',
            userId: user.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
          {
            token: 'token-2',
            userId: user.id,
            expiresAt: new Date(Date.now() + 86400000),
          },
        ],
      });

      // Verify tokens exist
      const tokensBefore = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(tokensBefore.length).toBeGreaterThan(1);

      // Logout
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Verify all tokens were deleted
      const tokensAfter = await prisma.refreshToken.findMany({
        where: { userId: user.id },
      });
      expect(tokensAfter).toHaveLength(0);

      // Verify refresh token no longer works
      await request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(401);
    });
  });
});
