import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiParam,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/user.interface';

@ApiTags('posts')
@ApiBearerAuth('JWT-auth')
@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  async findAll(@CurrentUser() user: any) {
    return this.postsService.findAll(user.id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('image'))
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createPostDto: CreatePostDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    image?: Express.Multer.File,
  ) {
    return this.postsService.create(user.id, createPostDto, image);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.findOne(id, user.id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    image?: Express.Multer.File,
  ) {
    return this.postsService.update(id, user.id, updatePostDto, image);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.remove(id, user.id);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.postsService.getComments(id);
  }

  @Post(':id/comments')
  async createComment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    return this.postsService.createComment(id, user.id, createCommentDto);
  }

  @Delete('comments/:id')
  async deleteComment(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.deleteComment(id, user.id);
  }

  @Get(':id/reactions')
  async getReactions(@Param('id') id: string) {
    return this.postsService.getReactions(id);
  }

  @Post(':id/reactions')
  async createReaction(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() createReactionDto: CreateReactionDto,
  ) {
    return this.postsService.createReaction(id, user.id, createReactionDto);
  }

  @Delete(':id/reactions')
  async deleteReaction(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.deleteReaction(id, user.id);
  }
}
