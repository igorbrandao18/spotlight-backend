import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelpers } from './helpers/test-helpers';

describe('Chat E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await app.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();

    const user1 = await TestHelpers.createUser();
    const user2 = await TestHelpers.createUser();
    user1Id = user1.id;
    user2Id = user2.id;

    const login1 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user1.email, password: 'password123' });
    user1Token = login1.body.jwtToken;

    const login2 = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user2.email, password: 'password123' });
    user2Token = login2.body.jwtToken;
  });

  describe('Complete Chat Flow', () => {
    it('should complete full chat flow', async () => {
      // 1. Create or get one-on-one room
      const roomResponse = await request(app.getHttpServer())
        .post(`/api/chat/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      const roomId = roomResponse.body.id;
      expect(roomResponse.body.type).toBe('ONE_ON_ONE');

      // 2. Get room details
      const roomDetails = await request(app.getHttpServer())
        .get(`/api/chat/${roomId}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(roomDetails.body.id).toBe(roomId);

      // 3. Send message from user1
      const message1 = await request(app.getHttpServer())
        .post(`/api/chat/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          content: 'Hello, this is a test message',
        })
        .expect(201);

      expect(message1.body.content).toBe('Hello, this is a test message');
      expect(message1.body.senderId).toBe(user1Id);

      // 4. Send message from user2
      const message2 = await request(app.getHttpServer())
        .post(`/api/chat/${roomId}/messages`)
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          content: 'Hi! This is a reply',
        })
        .expect(201);

      expect(message2.body.content).toBe('Hi! This is a reply');
      expect(message2.body.senderId).toBe(user2Id);

      // 5. Get messages
      const messagesResponse = await request(app.getHttpServer())
        .get(`/api/chat/${roomId}/messages`)
        .set('Authorization', `Bearer ${user1Token}`)
        .query({ page: 0, size: 10 })
        .expect(200);

      expect(messagesResponse.body.length).toBeGreaterThanOrEqual(2);
      expect(
        messagesResponse.body.some((m: any) => m.content.includes('Hello')),
      ).toBe(true);
      expect(
        messagesResponse.body.some((m: any) => m.content.includes('Hi')),
      ).toBe(true);

      // 6. List all rooms for user1
      const roomsResponse = await request(app.getHttpServer())
        .get('/api/chat')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(Array.isArray(roomsResponse.body)).toBe(true);
      expect(roomsResponse.body.some((r: any) => r.id === roomId)).toBe(true);
    });

    it('should return same room when creating one-on-one room twice', async () => {
      const room1 = await request(app.getHttpServer())
        .post(`/api/chat/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      const room2 = await request(app.getHttpServer())
        .post(`/api/chat/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(201);

      expect(room1.body.id).toBe(room2.body.id);
    });
  });
});
