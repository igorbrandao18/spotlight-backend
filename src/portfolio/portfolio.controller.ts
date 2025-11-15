import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
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
  ApiQuery,
} from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { CreatePortfolioCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/user.interface';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('portfolio')
@ApiBearerAuth('JWT-auth')
@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('userId') userId?: string,
    @Query() pagination: PaginationDto = { page: 1, limit: 20 },
  ) {
    return this.portfolioService.findAll(userId, pagination);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10))
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createDto: CreatePortfolioItemDto,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|gif|webp|mp4|mov|mp3|wav|pdf)$/,
          }),
        ],
      }),
    )
    files?: Express.Multer.File[],
  ) {
    return this.portfolioService.create(user.id, createDto, files);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.portfolioService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('files', 10))
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() updateDto: UpdatePortfolioItemDto,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({
            fileType: /(jpg|jpeg|png|gif|webp|mp4|mov|mp3|wav|pdf)$/,
          }),
        ],
      }),
    )
    files?: Express.Multer.File[],
  ) {
    return this.portfolioService.update(id, user.id, updateDto, files);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.portfolioService.remove(id, user.id);
  }

  @Post(':id/like')
  async like(@Param('id') id: string, @CurrentUser() user: any) {
    return this.portfolioService.like(id, user.id);
  }

  @Post(':id/unlike')
  async unlike(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.portfolioService.unlike(id, user.id);
  }

  @Get(':id/likes')
  async getLikes(@Param('id') id: string) {
    return this.portfolioService.getLikes(id);
  }

  @Post(':id/view')
  async view(@Param('id') id: string) {
    return this.portfolioService.view(id);
  }

  @Get('comments/:itemId')
  async getComments(
    @Param('itemId') itemId: string,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 0;
    const sizeNum = size ? parseInt(size, 10) : 10;
    return this.portfolioService.getComments(itemId, pageNum, sizeNum);
  }

  @Post('comments/:itemId')
  async createComment(
    @Param('itemId') itemId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() createDto: CreatePortfolioCommentDto,
  ) {
    return this.portfolioService.createComment(itemId, user.id, createDto);
  }

  @Put('comments/:itemId/:commentId')
  async updateComment(
    @Param('itemId') itemId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { content: string; parentId?: string },
  ) {
    return this.portfolioService.updateComment(
      itemId,
      commentId,
      user.id,
      body.content,
      body.parentId,
    );
  }

  @Delete('comments/:itemId/:commentId')
  async deleteComment(
    @Param('itemId') itemId: string,
    @Param('commentId') commentId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.portfolioService.deleteComment(itemId, commentId, user.id);
  }

  @Post('comments/:itemId/:commentId/like')
  async likeComment(
    @Param('itemId') itemId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.portfolioService.likeComment(itemId, commentId);
  }

  @Post('comments/:itemId/:commentId/unlike')
  async unlikeComment(
    @Param('itemId') itemId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.portfolioService.unlikeComment(itemId, commentId);
  }
}
