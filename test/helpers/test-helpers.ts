import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export class TestHelpers {
  static async createUser(overrides: Partial<any> = {}) {
    const hashedPassword = await bcrypt.hash('password123', 10);
    return prisma.user.create({
      data: {
        email: overrides.email || `test${Date.now()}@example.com`,
        name: 'Test User',
        password: hashedPassword,
        areaActivity: 'Photography',
        ...overrides,
        password: overrides.password ? await bcrypt.hash(overrides.password as string, 10) : hashedPassword,
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
    const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename FROM pg_tables WHERE schemaname='public'
    `;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await prisma.$executeRawUnsafe(`TRUNCATE TABLE "public"."${tablename}" CASCADE;`);
        } catch (error) {
          console.log({ error });
        }
      }
    }
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

