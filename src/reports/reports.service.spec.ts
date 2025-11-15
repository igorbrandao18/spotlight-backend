import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { NotFoundException } from '@nestjs/common';

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await module.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();
  });

  describe('create', () => {
    it('should create a report', async () => {
      const reporter = await TestHelpers.createUser();
      const reportedUser = await TestHelpers.createUser();

      const createDto = {
        reportedUserId: reportedUser.id,
        reason: 'SPAM',
        category: 'USER',
        description: 'This user is spamming',
      };

      const result = await service.create(reporter.id, createDto);

      expect(result).toHaveProperty('id');
      expect(result.reason).toBe(createDto.reason);

      const report = await prisma.report.findUnique({
        where: { id: result.id },
      });
      expect(report).toBeDefined();
      expect(report.reporterId).toBe(reporter.id);
      expect(report.reportedUserId).toBe(reportedUser.id);
    });
  });

  describe('findAll', () => {
    it('should return list of reports for admin', async () => {
      const admin = await TestHelpers.createUser({ role: 'ADMIN' });
      const reporter = await TestHelpers.createUser();
      const reportedUser = await TestHelpers.createUser();

      await prisma.report.create({
        data: {
          reporterId: reporter.id,
          reportedUserId: reportedUser.id,
          reason: 'SPAM',
          category: 'USER',
          status: 'PENDING',
        },
      });

      const result = await service.findAll(admin.id, {});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw ForbiddenException for non-admin users', async () => {
      const user = await TestHelpers.createUser();

      await expect(service.findAll(user.id, {})).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    it('should return a report by id for admin', async () => {
      const admin = await TestHelpers.createUser({ role: 'ADMIN' });
      const reporter = await TestHelpers.createUser();
      const reportedUser = await TestHelpers.createUser();

      const report = await prisma.report.create({
        data: {
          reporterId: reporter.id,
          reportedUserId: reportedUser.id,
          reason: 'SPAM',
          category: 'USER',
          status: 'PENDING',
        },
      });

      const result = await service.findOne(admin.id, report.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(report.id);
    });

    it('should throw NotFoundException if report not found', async () => {
      const admin = await TestHelpers.createUser({ role: 'ADMIN' });

      await expect(service.findOne(admin.id, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update report status', async () => {
      const admin = await TestHelpers.createUser({ role: 'ADMIN' });
      const reporter = await TestHelpers.createUser();
      const reportedUser = await TestHelpers.createUser();

      const report = await prisma.report.create({
        data: {
          reporterId: reporter.id,
          reportedUserId: reportedUser.id,
          reason: 'SPAM',
          category: 'USER',
          status: 'PENDING',
        },
      });

      const updateDto = {
        status: 'RESOLVED',
        adminNotes: 'Issue resolved',
      };

      const result = await service.updateStatus(admin.id, report.id, updateDto);

      expect(result.status).toBe(updateDto.status);
      expect(result.adminNotes).toBe(updateDto.adminNotes);

      const updatedReport = await prisma.report.findUnique({
        where: { id: report.id },
      });
      expect(updatedReport.status).toBe(updateDto.status);
    });
  });
});
