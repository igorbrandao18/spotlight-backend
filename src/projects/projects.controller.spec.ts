import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';

describe('ProjectsController', () => {
  let app: INestApplication;
  let controller: ProjectsController;
  let service: ProjectsService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    controller = moduleFixture.get<ProjectsController>(ProjectsController);
    service = moduleFixture.get<ProjectsService>(ProjectsService);
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
        });
    });
  });

  describe('GET /api/projects/list', () => {
    it('should return list of projects', async () => {
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

  describe('GET /api/projects/:id', () => {
    it('should return a project by id', async () => {
      const project = await TestHelpers.createProject(userId);

      return request(app.getHttpServer())
        .get(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(project.id);
        });
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update a project', async () => {
      const project = await TestHelpers.createProject(userId);

      return request(app.getHttpServer())
        .put(`/api/projects/${project.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Updated title',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe('Updated title');
        });
    });
  });

  describe('POST /api/projects/:id/members', () => {
    it('should add member to project', async () => {
      const project = await TestHelpers.createProject(userId);
      const member = await TestHelpers.createUser();

      return request(app.getHttpServer())
        .post(`/api/projects/${project.id}/members`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          userId: member.id,
          role: 'MEMBER',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.userId).toBe(member.id);
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

