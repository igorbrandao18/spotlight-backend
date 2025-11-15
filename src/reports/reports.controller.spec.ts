import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportsController', () => {
  let app: INestApplication;
  let controller: ReportsController;
  let service: ReportsService;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    controller = moduleFixture.get<ReportsController>(ReportsController);
    service = moduleFixture.get<ReportsService>(ReportsService);
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

    const admin = await TestHelpers.createUser({ role: 'ADMIN' });
    adminId = admin.id;

    const userLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'password123',
      });
    userToken = userLoginResponse.body.jwtToken;

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: admin.email,
        password: 'password123',
      });
    adminToken = adminLoginResponse.body.jwtToken;
  });

  describe('POST /api/reports/new', () => {
    it('should create a report', async () => {
      const reportedUser = await TestHelpers.createUser();

      return request(app.getHttpServer())
        .post('/api/reports/new')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedUserId: reportedUser.id,
          reason: 'SPAM',
          category: 'USER',
          description: 'This user is spamming',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.reason).toBe('SPAM');
        });
    });
  });

  describe('GET /api/reports', () => {
    it('should return list of reports (admin only)', async () => {
      const reportedUser = await TestHelpers.createUser();

      await prisma.report.create({
        data: {
          reporterId: userId,
          reportedUserId: reportedUser.id,
          reason: 'SPAM',
          category: 'USER',
          description: 'Test report',
          status: 'PENDING',
        },
      });

      return request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return 403 for non-admin users', () => {
      return request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('GET /api/reports/:id', () => {
    it('should return a report by id (admin only)', async () => {
      const reportedUser = await TestHelpers.createUser();

      const report = await prisma.report.create({
        data: {
          reporterId: userId,
          reportedUserId: reportedUser.id,
          reason: 'SPAM',
          category: 'USER',
          description: 'Test report',
          status: 'PENDING',
        },
      });

      return request(app.getHttpServer())
        .get(`/api/reports/${report.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(report.id);
        });
    });
  });

  describe('PUT /api/reports/:id', () => {
    it('should update report status (admin only)', async () => {
      const reportedUser = await TestHelpers.createUser();

      const report = await prisma.report.create({
        data: {
          reporterId: userId,
          reportedUserId: reportedUser.id,
          reason: 'SPAM',
          category: 'USER',
          description: 'Test report',
          status: 'PENDING',
        },
      });

      return request(app.getHttpServer())
        .put(`/api/reports/${report.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'RESOLVED',
          adminNotes: 'Issue resolved',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('RESOLVED');
        });
    });
  });
});

