import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
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
    it('should create a project', async () => {
      const user = await TestHelpers.createUser();

      const createProjectDto = {
        title: 'Test Project',
        description: 'Test description',
        status: 'TODO',
      };

      const result = await service.create(user.id, createProjectDto);

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(createProjectDto.title);

      const project = await prisma.project.findUnique({
        where: { id: result.id },
      });
      expect(project).toBeDefined();
      expect(project.ownerId).toBe(user.id);
    });
  });

  describe('findAll', () => {
    it('should return list of projects', async () => {
      const user = await TestHelpers.createUser();
      await TestHelpers.createProject(user.id);
      await TestHelpers.createProject(user.id);

      const result = await service.findAll(user.id, {});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return a project by id', async () => {
      const user = await TestHelpers.createUser();
      const project = await TestHelpers.createProject(user.id);

      const result = await service.findOne(user.id, project.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(project.id);
    });

    it('should throw NotFoundException if project not found', async () => {
      const user = await TestHelpers.createUser();

      await expect(service.findOne(user.id, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const user = await TestHelpers.createUser();
      const project = await TestHelpers.createProject(user.id);

      const updateDto = {
        title: 'Updated title',
      };

      const result = await service.update(user.id, project.id, updateDto);

      expect(result.title).toBe(updateDto.title);

      const updatedProject = await prisma.project.findUnique({
        where: { id: project.id },
      });
      expect(updatedProject.title).toBe(updateDto.title);
    });

    it('should throw ForbiddenException if user is not owner or admin', async () => {
      const owner = await TestHelpers.createUser();
      const otherUser = await TestHelpers.createUser();
      const project = await TestHelpers.createProject(owner.id);

      await expect(
        service.update(otherUser.id, project.id, { title: 'test' }),
      ).rejects.toThrow('ForbiddenException');
    });
  });

  describe('addMember', () => {
    it('should add member to project', async () => {
      const owner = await TestHelpers.createUser();
      const member = await TestHelpers.createUser();
      const project = await TestHelpers.createProject(owner.id);

      const addMemberDto = {
        userId: member.id,
        role: 'MEMBER',
      };

      const result = await service.addMember(
        owner.id,
        project.id,
        addMemberDto,
      );

      expect(result).toHaveProperty('userId', member.id);

      const projectMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: member.id,
            projectId: project.id,
          },
        },
      });
      expect(projectMember).toBeDefined();
    });
  });

  describe('createMilestone', () => {
    it('should create a milestone', async () => {
      const owner = await TestHelpers.createUser();
      const project = await TestHelpers.createProject(owner.id);

      const milestoneDto = {
        title: 'Milestone 1',
        description: 'First milestone',
        status: 'TODO',
      };

      const result = await service.createMilestone(
        owner.id,
        project.id,
        milestoneDto,
      );

      expect(result).toHaveProperty('id');
      expect(result.title).toBe(milestoneDto.title);

      const milestone = await prisma.projectMilestone.findUnique({
        where: { id: result.id },
      });
      expect(milestone).toBeDefined();
      expect(milestone.projectId).toBe(project.id);
    });
  });
});
