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
import { FilesInterceptor } from '@nestjs/platform-express';
import { PortfolioService } from './portfolio.service';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { CreatePortfolioCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('portfolio')
@UseGuards(JwtAuthGuard)
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  async findAll(@Query('userId') userId?: string) {
    return this.portfolioService.findAll(userId);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10))
  async create(
    @CurrentUser() user: any,
    @Body() createDto: CreatePortfolioItemDto,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|mp4|mov|mp3|wav|pdf)$/ }),
        ],
      }),
    )
    files?: Express.Multer.File[],
  ) {
    return this.portfolioService.create(user.id, createDto, files);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.portfolioService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('files', 10))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
    @Body() updateDto: UpdatePortfolioItemDto,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|mp4|mov|mp3|wav|pdf)$/ }),
        ],
      }),
    )
    files?: Express.Multer.File[],
  ) {
    return this.portfolioService.update(id, user.id, updateDto, files);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.portfolioService.remove(id, user.id);
  }

  @Post(':id/like')
  async like(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.portfolioService.like(id, user.id);
  }

  @Post(':id/unlike')
  async unlike(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    return this.portfolioService.unlike(id, user.id);
  }

  @Get(':id/likes')
  async getLikes(@Param('id', ParseIntPipe) id: number) {
    return this.portfolioService.getLikes(id);
  }

  @Post(':id/view')
  async view(@Param('id', ParseIntPipe) id: number) {
    return this.portfolioService.view(id);
  }

  @Get('comments/:itemId')
  async getComments(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Query('page') page?: string,
    @Query('size') size?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 0;
    const sizeNum = size ? parseInt(size, 10) : 10;
    return this.portfolioService.getComments(itemId, pageNum, sizeNum);
  }

  @Post('comments/:itemId')
  async createComment(
    @Param('itemId', ParseIntPipe) itemId: number,
    @CurrentUser() user: any,
    @Body() createDto: CreatePortfolioCommentDto,
  ) {
    return this.portfolioService.createComment(itemId, user.id, createDto);
  }

  @Put('comments/:itemId/:commentId')
  async updateComment(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: any,
    @Body() body: { content: string; parentId?: number },
  ) {
    return this.portfolioService.updateComment(itemId, commentId, user.id, body.content, body.parentId);
  }

  @Delete('comments/:itemId/:commentId')
  async deleteComment(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: any,
  ) {
    return this.portfolioService.deleteComment(itemId, commentId, user.id);
  }

  @Post('comments/:itemId/:commentId/like')
  async likeComment(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.portfolioService.likeComment(itemId, commentId);
  }

  @Post('comments/:itemId/:commentId/unlike')
  async unlikeComment(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.portfolioService.unlikeComment(itemId, commentId);
  }
}

