import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';
import { ChatMessageRequestDto } from './dto/chat-message-request.dto';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure properly in production
  },
  namespace: '/api/ws',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query.token as string;
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      const userId = payload.sub;
      this.connectedUsers.set(userId, client.id);
      client.data.userId = userId;

      // Join user's personal room
      client.join(`user:${userId}`);

      // Notify user is online
      this.server.emit('user_online', { userId });

      console.log(`User ${userId} connected: ${client.id}`);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      this.connectedUsers.delete(userId);
      this.server.emit('user_offline', { userId });
      console.log(`User ${userId} disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('join')
  async handleJoin(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Verify user is member of room
      await this.chatService.getChatRoom(roomId, userId);
      client.join(`room:${roomId}`);
      return { success: true, roomId };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('leave')
  async handleLeave(@ConnectedSocket() client: Socket, @MessageBody() roomId: string) {
    client.leave(`room:${roomId}`);
    return { success: true, roomId };
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string; type?: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      const messageDto: ChatMessageRequestDto = {
        content: data.content,
        type: data.type as any,
      };

      const message = await this.chatService.createMessage(
        data.roomId,
        userId,
        messageDto,
      );

      // Broadcast to room
      this.server.to(`room:${data.roomId}`).emit('message', message);

      return { success: true, message };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    // Broadcast typing indicator to room (except sender)
    client.to(`room:${data.roomId}`).emit('typing', {
      userId,
      roomId: data.roomId,
      isTyping: data.isTyping,
    });
  }
}

