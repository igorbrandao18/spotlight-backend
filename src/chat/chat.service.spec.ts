import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { NotFoundException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await module.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();
  });

  describe('findAllRooms', () => {
    it('should return list of chat rooms for user', async () => {
      const user1 = await TestHelpers.createUser();
      const user2 = await TestHelpers.createUser();

      const room = await prisma.chatRoom.create({
        data: {
          isGroup: false,
          members: {
            create: [{ userId: user1.id }, { userId: user2.id }],
          },
        },
      });

      const result = await service.findAllRooms(user1.id);

      expect(Array.isArray(result)).toBe(true);
      expect(result.some((r) => r.id === room.id)).toBe(true);
    });
  });

  describe('findOneRoom', () => {
    it('should return a chat room by id', async () => {
      const user1 = await TestHelpers.createUser();
      const user2 = await TestHelpers.createUser();

      const room = await prisma.chatRoom.create({
        data: {
          isGroup: false,
          members: {
            create: [{ userId: user1.id }, { userId: user2.id }],
          },
        },
      });

      const result = await service.findOneRoom(user1.id, room.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(room.id);
    });

    it('should throw NotFoundException if room not found', async () => {
      const user = await TestHelpers.createUser();

      await expect(service.findOneRoom(user.id, 'invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findOrCreateOneOnOneRoom', () => {
    it('should create a new one-on-one room', async () => {
      const user1 = await TestHelpers.createUser();
      const user2 = await TestHelpers.createUser();

      const result = await service.findOrCreateOneOnOneRoom(user1.id, user2.id);

      expect(result).toBeDefined();
      expect(result.isGroup).toBe(false);

      const room = await prisma.chatRoom.findUnique({
        where: { id: result.id },
        include: { members: true },
      });

      expect(room.members.length).toBe(2);
      expect(room.members.some((m) => m.userId === user1.id)).toBe(true);
      expect(room.members.some((m) => m.userId === user2.id)).toBe(true);
    });

    it('should return existing room if already exists', async () => {
      const user1 = await TestHelpers.createUser();
      const user2 = await TestHelpers.createUser();

      const room1 = await service.findOrCreateOneOnOneRoom(user1.id, user2.id);
      const room2 = await service.findOrCreateOneOnOneRoom(user1.id, user2.id);

      expect(room1.id).toBe(room2.id);
    });
  });

  describe('getMessages', () => {
    it('should return messages for a room', async () => {
      const user1 = await TestHelpers.createUser();
      const user2 = await TestHelpers.createUser();

      const room = await prisma.chatRoom.create({
        data: {
          isGroup: false,
          members: {
            create: [{ userId: user1.id }, { userId: user2.id }],
          },
          messages: {
            create: [
              { content: 'Message 1', senderId: user1.id },
              { content: 'Message 2', senderId: user2.id },
            ],
          },
        },
      });

      const result = await service.getMessages(user1.id, room.id, {
        page: 0,
        size: 10,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('createMessage', () => {
    it('should create a message in room', async () => {
      const user1 = await TestHelpers.createUser();
      const user2 = await TestHelpers.createUser();

      const room = await prisma.chatRoom.create({
        data: {
          isGroup: false,
          members: {
            create: [{ userId: user1.id }, { userId: user2.id }],
          },
        },
      });

      const messageDto = {
        content: 'Hello, this is a test message',
      };

      const result = await service.createMessage(user1.id, room.id, messageDto);

      expect(result).toHaveProperty('id');
      expect(result.content).toBe(messageDto.content);

      const message = await prisma.chatMessage.findUnique({
        where: { id: result.id },
      });
      expect(message).toBeDefined();
      expect(message.senderId).toBe(user1.id);
      expect(message.roomId).toBe(room.id);
    });
  });
});
