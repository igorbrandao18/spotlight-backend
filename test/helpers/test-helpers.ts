import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export class TestHelpers {
  static async createUser(overrides: Partial<any> = {}) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    return prisma.user.create({
      data: {
        email: `test${Date.now()}@example.com`,
        name: 'Test User',
        password: hashedPassword,
        areaActivity: 'Photography',
        ...overrides,
      },
    });
  }

  static async createPost(authorId: string, overrides: Partial<any> = {}) {
    return prisma.post.create({
      data: {
        content: 'Test post content',
        authorId,
        ...overrides,
      },
    });
  }

  static async createProject(ownerId: string, overrides: Partial<any> = {}) {
    return prisma.project.create({
      data: {
        title: 'Test Project',
        ownerId,
        status: 'TODO',
        ...overrides,
      },
    });
  }

  static async cleanup() {
    // Delete in correct order to respect foreign keys
    await prisma.postReaction.deleteMany();
    await prisma.postComment.deleteMany();
    await prisma.post.deleteMany();
    await prisma.projectMilestone.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  }

  static async getAuthToken(email: string, password: string, app: any): Promise<string> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password },
    });

    const body = JSON.parse(response.body);
    return body.jwtToken;
  }
}

