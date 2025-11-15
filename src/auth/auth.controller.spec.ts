import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
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

    it('should return 400 if validation fails', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          name: 'John',
          email: 'invalid-email',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
      const user = await TestHelpers.createUser();

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

      return request(app.getHttpServer())
        .post('/api/auth/refresh-token')
        .send({ refreshToken: loginResponse.body.refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('jwtToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });
  });
});
