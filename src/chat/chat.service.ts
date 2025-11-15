import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { ChatMessageRequestDto } from './dto/chat-message-request.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getChatRooms(userId: string) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
        archived: false,
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return rooms.map((room) => ({
      id: room.id,
      name: room.name,
      isGroup: room.isGroup,
      archived: room.archived,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      members: room.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
      })),
    }));
  }

  async getChatRoom(roomId: string, userId: string) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Chat room not found');
    }

    // Check if user is a member
    const isMember = room.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('You are not a member of this room');
    }

    return {
      id: room.id,
      name: room.name,
      isGroup: room.isGroup,
      archived: room.archived,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      members: room.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
      })),
    };
  }

  async createOrGetChatRoom(
    userId: string,
    createChatRoomDto: CreateChatRoomDto,
  ) {
    // For 1-on-1 chat, check if room already exists
    if (createChatRoomDto.userId && !createChatRoomDto.isGroup) {
      const existingRoom = await this.prisma.chatRoom.findFirst({
        where: {
          isGroup: false,
          members: {
            every: {
              userId: {
                in: [userId, createChatRoomDto.userId],
              },
            },
          },
        },
        include: {
          members: true,
        },
      });

      // Check if room has exactly these 2 members
      if (existingRoom && existingRoom.members.length === 2) {
        const memberIds = existingRoom.members.map((m) => m.userId);
        if (
          memberIds.includes(userId) &&
          memberIds.includes(createChatRoomDto.userId)
        ) {
          return this.getChatRoom(existingRoom.id, userId);
        }
      }
    }

    // Create new room
    const memberIds = createChatRoomDto.userIds || [];
    if (createChatRoomDto.userId) {
      memberIds.push(createChatRoomDto.userId);
    }
    memberIds.push(userId); // Add creator

    // Remove duplicates
    const uniqueMemberIds = [...new Set(memberIds)];

    if (uniqueMemberIds.length < 2) {
      throw new BadRequestException('Chat room must have at least 2 members');
    }

    const room = await this.prisma.chatRoom.create({
      data: {
        name: createChatRoomDto.name,
        isGroup: createChatRoomDto.isGroup || uniqueMemberIds.length > 2,
        members: {
          create: uniqueMemberIds.map((memberId) => ({
            userId: memberId,
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return {
      id: room.id,
      name: room.name,
      isGroup: room.isGroup,
      archived: room.archived,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      members: room.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        avatar: m.user.avatar,
      })),
    };
  }

  async getMessages(
    roomId: string,
    userId: string,
    page: number = 0,
    size: number = 20,
  ) {
    // Verify user is member
    await this.getChatRoom(roomId, userId);

    const messages = await this.prisma.chatMessage.findMany({
      where: { roomId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: page * size,
      take: size,
    });

    // Reverse to get chronological order
    return messages.reverse().map((msg) => ({
      id: msg.id,
      content: msg.content,
      sender: msg.sender.id,
      senderName: msg.sender.name,
      from: msg.sender.id,
      message: msg.content,
      type: msg.type,
      sentAt: msg.createdAt.toISOString(),
      timestamp: msg.createdAt.toISOString(),
      createdAt: msg.createdAt.toISOString(),
    }));
  }

  async createMessage(
    roomId: string,
    userId: string,
    messageDto: ChatMessageRequestDto,
  ) {
    // Verify user is member
    await this.getChatRoom(roomId, userId);

    const message = await this.prisma.chatMessage.create({
      data: {
        content: messageDto.content,
        roomId,
        senderId: userId,
        type: messageDto.type || 'TEXT',
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    // Update room updatedAt
    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() },
    });

    return {
      id: message.id,
      content: message.content,
      sender: message.sender.id,
      senderName: message.sender.name,
      from: message.sender.id,
      message: message.content,
      type: message.type,
      sentAt: message.createdAt.toISOString(),
      timestamp: message.createdAt.toISOString(),
      createdAt: message.createdAt.toISOString(),
    };
  }
}
