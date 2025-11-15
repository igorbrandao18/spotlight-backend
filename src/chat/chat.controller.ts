import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatRoomDto } from './dto/create-chat-room.dto';
import { ChatMessageRequestDto } from './dto/chat-message-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getChatRooms(@CurrentUser() user: any) {
    return this.chatService.getChatRooms(user.id);
  }

  @Get(':roomId')
  async getChatRoom(@Param('roomId') roomId: string, @CurrentUser() user: any) {
    return this.chatService.getChatRoom(roomId, user.id);
  }

  @Get(':roomId/messages')
  async getMessages(
    @Param('roomId') roomId: string,
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 0;
    const sizeNum = size ? parseInt(size, 10) : 20;
    return this.chatService.getMessages(roomId, user.id, pageNum, sizeNum);
  }

  @Post(':userId')
  async createOrGetChatRoom(
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.chatService.createOrGetChatRoom(user.id, { userId });
  }
}

