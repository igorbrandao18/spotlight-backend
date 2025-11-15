import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelpers } from './helpers/test-helpers';

describe('Projects E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let projectId: string;

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

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'password123',
      });

    authToken = loginResponse.body.jwtToken;
  });

  describe('POST /api/projects', () => {
    it('should create a project', () => {
      return request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Test Project',
          description: 'Test description',
          status: 'TODO',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Test Project');
          projectId = res.body.id;
        });
    });
  });

  describe('GET /api/projects/list', () => {
    it('should list user projects', async () => {
      await TestHelpers.createProject(userId);

      return request(app.getHttpServer())
        .get('/api/projects/list')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('POST /api/projects/:id/members', () => {
    it('should add member to project', async () => {
      const project = await TestHelpers.createProject(userId);
      const memberUser = await TestHelpers.createUser();

      return request(app.getHttpServer())
        .post(`/api/projects/${project.id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: memberUser.id,
          role: 'MEMBER',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('userId', memberUser.id);
        });
    });
  });

  describe('POST /api/projects/:id/milestones', () => {
    it('should create milestone', async () => {
      const project = await TestHelpers.createProject(userId);

      return request(app.getHttpServer())
        .post(`/api/projects/${project.id}/milestones`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Milestone 1',
          description: 'First milestone',
          status: 'TODO',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Milestone 1');
        });
    });
  });
});

