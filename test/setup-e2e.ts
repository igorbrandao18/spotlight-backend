import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database before all tests
  await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "refresh_tokens" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "posts" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "projects" CASCADE`;
});

afterAll(async () => {
  await prisma.$disconnect();
});
