import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/user.interface';

@ApiTags('chat')
@ApiBearerAuth('JWT-auth')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get()
  async getChatRooms(@CurrentUser() user: CurrentUserPayload) {
    return this.chatService.getChatRooms(user.id);
  }

  @Get(':roomId')
  async getChatRoom(
    @Param('roomId') roomId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.getChatRoom(roomId, user.id);
  }

  @Get(':roomId/messages')
  async getMessages(
    @Param('roomId') roomId: string,
    @CurrentUser() user: CurrentUserPayload,
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
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.chatService.createOrGetChatRoom(user.id, { userId });
  }
}
