import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { PrismaService } from '../prisma/prisma.service';

describe('ChatController', () => {
  let app: INestApplication;
  let controller: ChatController;
  let service: ChatService;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    controller = moduleFixture.get<ChatController>(ChatController);
    service = moduleFixture.get<ChatService>(ChatService);
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

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: user.email,
        password: 'password123',
      });

    authToken = loginResponse.body.jwtToken;
  });

  describe('GET /api/chat', () => {
    it('should return list of chat rooms', async () => {
      const user2 = await TestHelpers.createUser();

      await prisma.chatRoom.create({
        data: {
          type: 'ONE_ON_ONE',
          members: {
            create: [
              { userId },
              { userId: user2.id },
            ],
          },
        },
      });

      return request(app.getHttpServer())
        .get('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /api/chat/:roomId', () => {
    it('should return a chat room by id', async () => {
      const user2 = await TestHelpers.createUser();

      const room = await prisma.chatRoom.create({
        data: {
          type: 'ONE_ON_ONE',
          members: {
            create: [
              { userId },
              { userId: user2.id },
            ],
          },
        },
      });

      return request(app.getHttpServer())
        .get(`/api/chat/${room.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(room.id);
        });
    });
  });

  describe('GET /api/chat/:roomId/messages', () => {
    it('should return messages for a room', async () => {
      const user2 = await TestHelpers.createUser();

      const room = await prisma.chatRoom.create({
        data: {
          type: 'ONE_ON_ONE',
          members: {
            create: [
              { userId },
              { userId: user2.id },
            ],
          },
          messages: {
            create: [
              { content: 'Message 1', senderId: userId },
              { content: 'Message 2', senderId: user2.id },
            ],
          },
        },
      });

      return request(app.getHttpServer())
        .get(`/api/chat/${room.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 0, size: 10 })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
        });
    });
  });

  describe('POST /api/chat/:userId', () => {
    it('should create or get one-on-one room', async () => {
      const user2 = await TestHelpers.createUser();

      return request(app.getHttpServer())
        .post(`/api/chat/${user2.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.type).toBe('ONE_ON_ONE');
        });
    });
  });
});

