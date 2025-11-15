import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
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
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'John Doe',
          email: `john${Date.now()}@example.com`,
          password: 'password123',
          areaActivity: 'Photography',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('jwtToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body).toHaveProperty('userId');
        });
    });

    it('should return 400 if email already exists', async () => {
      const email = `test${Date.now()}@example.com`;
      await TestHelpers.createUser({ email });

      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'Another User',
          email,
          password: 'password123',
          areaActivity: 'Photography',
        })
        .expect(400);
    });

    it('should return 400 if validation fails', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'John',
          email: 'invalid-email',
          password: '123',
          areaActivity: 'Photography',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
      const user = await TestHelpers.createUser({
        email: `login${Date.now()}@example.com`,
      });

      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('jwtToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should return 401 with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token successfully', async () => {
      const user = await TestHelpers.createUser();
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: user.email,
          password: 'password123',
        });

      const refreshToken = loginResponse.body.refreshToken;

      return request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('jwtToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should return 401 with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });
});

