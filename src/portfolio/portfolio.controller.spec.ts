import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { PrismaService } from '../prisma/prisma.service';

describe('PortfolioController', () => {
  let app: INestApplication;
  let controller: PortfolioController;
  let service: PortfolioService;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    controller = moduleFixture.get<PortfolioController>(PortfolioController);
    service = moduleFixture.get<PortfolioService>(PortfolioService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);
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

  describe('POST /api/portfolio', () => {
    it('should create a portfolio item', () => {
      return request(app.getHttpServer())
        .post('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Portfolio Item',
          description: 'Test description',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Portfolio Item');
        });
    });
  });

  describe('GET /api/portfolio', () => {
    it('should return list of portfolio items', async () => {
      await prisma.portfolioItem.create({
        data: {
          title: 'Item 1',
          userId,
        },
      });

      return request(app.getHttpServer())
        .get('/api/portfolio')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ userId })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /api/portfolio/:id', () => {
    it('should return a portfolio item by id', async () => {
      const item = await prisma.portfolioItem.create({
        data: {
          title: 'Test Item',
          userId,
        },
      });

      return request(app.getHttpServer())
        .get(`/api/portfolio/${item.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(item.id);
        });
    });
  });

  describe('POST /api/portfolio/:id/like', () => {
    it('should like a portfolio item', async () => {
      const item = await prisma.portfolioItem.create({
        data: {
          title: 'Test Item',
          userId,
        },
      });

      return request(app.getHttpServer())
        .post(`/api/portfolio/${item.id}/like`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);
    });
  });

  describe('POST /api/comments/:itemId', () => {
    it('should create a comment on portfolio item', async () => {
      const item = await prisma.portfolioItem.create({
        data: {
          title: 'Test Item',
          userId,
        },
      });

      return request(app.getHttpServer())
        .post(`/api/comments/${item.id}`)
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
});

