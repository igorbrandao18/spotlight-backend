import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelpers } from './helpers/test-helpers';

describe('Reports E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let adminToken: string;
  let userId: string;
  let adminId: string;
  let reportId: string;

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

    const admin = await TestHelpers.createUser({ role: 'ADMIN' });
    adminId = admin.id;

    const userLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: 'password123' });
    userToken = userLoginResponse.body.jwtToken;

    const adminLoginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'password123' });
    adminToken = adminLoginResponse.body.jwtToken;
  });

  describe('Complete Report Flow', () => {
    it('should complete full report moderation flow', async () => {
      const reportedUser = await TestHelpers.createUser();

      // 1. Create report (any user can report)
      const createReportResponse = await request(app.getHttpServer())
        .post('/api/reports/new')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reportedUserId: reportedUser.id,
          reason: 'SPAM',
          category: 'USER',
          description: 'This user is spamming',
        })
        .expect(201);

      reportId = createReportResponse.body.id;
      expect(createReportResponse.body.reason).toBe('SPAM');
      expect(createReportResponse.body.status).toBe('PENDING');

      // 2. List reports (admin only)
      const listReportsResponse = await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(listReportsResponse.body)).toBe(true);
      expect(listReportsResponse.body.some((r: any) => r.id === reportId)).toBe(true);

      // 3. Get report details (admin only)
      const getReportResponse = await request(app.getHttpServer())
        .get(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getReportResponse.body.id).toBe(reportId);
      expect(getReportResponse.body.reportedUserId).toBe(reportedUser.id);
      expect(getReportResponse.body.reporterId).toBe(userId);

      // 4. Update report status (admin only)
      const updateReportResponse = await request(app.getHttpServer())
        .put(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'RESOLVED',
          adminNotes: 'Issue has been resolved',
        })
        .expect(200);

      expect(updateReportResponse.body.status).toBe('RESOLVED');
      expect(updateReportResponse.body.adminNotes).toBe('Issue has been resolved');

      // 5. Verify non-admin cannot access reports list
      await request(app.getHttpServer())
        .get('/api/reports')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // 6. Verify non-admin cannot update report status
      await request(app.getHttpServer())
        .put(`/api/reports/${reportId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          status: 'RESOLVED',
        })
        .expect(403);
    });

    it('should handle different report reasons', async () => {
      const reportedUser = await TestHelpers.createUser();

      const reasons = ['SPAM', 'INAPPROPRIATE_CONTENT', 'HARASSMENT', 'FAKE_ACCOUNT', 'OTHER'];

      for (const reason of reasons) {
        const response = await request(app.getHttpServer())
          .post('/api/reports/new')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            reportedUserId: reportedUser.id,
            reason,
            description: `Report for ${reason}`,
          })
          .expect(201);

        expect(response.body.reason).toBe(reason);
      }
    });
  });
});

