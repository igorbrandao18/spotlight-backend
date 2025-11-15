import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePortfolioItemDto } from './dto/create-portfolio-item.dto';
import { UpdatePortfolioItemDto } from './dto/update-portfolio-item.dto';
import { CreatePortfolioCommentDto } from './dto/create-comment.dto';

@Injectable()
export class PortfolioService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: string) {
    const where = userId ? { userId } : {};
    const items = await this.prisma.portfolioItem.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        media: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      likeCount: item.likeCount,
      viewCount: item.viewCount,
      media: item.media.map((m) => ({
        id: m.id,
        url: m.url,
        type: m.type,
        createdAt: m.createdAt.toISOString(),
      })),
    }));
  }

  async findOne(id: string) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        media: true,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Portfolio item not found');
    }

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      likeCount: item.likeCount,
      viewCount: item.viewCount,
      media: item.media.map((m) => ({
        id: m.id,
        url: m.url,
        type: m.type,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async create(userId: string, createDto: CreatePortfolioItemDto, files?: Express.Multer.File[]) {
    // TODO: Upload files to S3/Cloudinary
    const mediaUrls = files?.map((file, index) => ({
      url: `/uploads/portfolio/${userId}-${Date.now()}-${index}.${file.originalname.split('.').pop()}`,
      type: this.getFileType(file.mimetype),
    })) || [];

    const item = await this.prisma.portfolioItem.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        userId,
        media: {
          create: mediaUrls,
        },
      },
      include: {
        media: true,
      },
    });

    return {
      id: item.id,
      title: item.title,
      description: item.description,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      likeCount: 0,
      viewCount: 0,
      media: item.media.map((m) => ({
        id: m.id,
        url: m.url,
        type: m.type,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async update(id: string, userId: string, updateDto: UpdatePortfolioItemDto, files?: Express.Multer.File[]) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Portfolio item not found');
    }

    if (item.userId !== userId) {
      throw new ForbiddenException('You can only update your own portfolio items');
    }

    // TODO: Upload files to S3/Cloudinary
    const mediaUrls = files?.map((file, index) => ({
      url: `/uploads/portfolio/${userId}-${Date.now()}-${index}.${file.originalname.split('.').pop()}`,
      type: this.getFileType(file.mimetype),
    })) || [];

    const updatedItem = await this.prisma.portfolioItem.update({
      where: { id },
      data: {
        title: updateDto.title,
        description: updateDto.description,
        ...(mediaUrls.length > 0 && {
          media: {
            create: mediaUrls,
          },
        }),
      },
      include: {
        media: true,
      },
    });

    return {
      id: updatedItem.id,
      title: updatedItem.title,
      description: updatedItem.description,
      createdAt: updatedItem.createdAt.toISOString(),
      updatedAt: updatedItem.updatedAt.toISOString(),
      likeCount: updatedItem.likeCount,
      viewCount: updatedItem.viewCount,
      media: updatedItem.media.map((m) => ({
        id: m.id,
        url: m.url,
        type: m.type,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  async remove(id: string, userId: string) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Portfolio item not found');
    }

    if (item.userId !== userId) {
      throw new ForbiddenException('You can only delete your own portfolio items');
    }

    await this.prisma.portfolioItem.delete({
      where: { id },
    });
  }

  async like(id: string, userId: string) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id },
    });

    if (!item) {
      throw new NotFoundException('Portfolio item not found');
    }

    const existingLike = await this.prisma.portfolioLike.findUnique({
      where: {
        portfolioItemId_userId: {
          portfolioItemId: id,
          userId,
        },
      },
    });

    if (existingLike) {
      throw new BadRequestException('Already liked');
    }

    await this.prisma.portfolioItem.update({
      where: { id },
      data: {
        likeCount: { increment: 1 },
        likes: {
          create: {
            userId,
          },
        },
      },
    });
  }

  async unlike(id: string, userId: string) {
    const like = await this.prisma.portfolioLike.findUnique({
      where: {
        portfolioItemId_userId: {
          portfolioItemId: id,
          userId,
        },
      },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    await this.prisma.portfolioItem.update({
      where: { id },
      data: {
        likeCount: { decrement: 1 },
        likes: {
          delete: {
            id: like.id,
          },
        },
      },
    });
  }

  async getLikes(id: string) {
    const likes = await this.prisma.portfolioLike.findMany({
      where: { portfolioItemId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return likes.map((like) => ({
      userId: like.user.id,
      username: like.user.name,
      likedAt: like.createdAt.toISOString(),
    }));
  }

  async view(id: string) {
    await this.prisma.portfolioItem.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
      },
    });
  }

  async getComments(itemId: string, page: number = 0, size: number = 10) {
    const comments = await this.prisma.portfolioComment.findMany({
      where: {
        portfolioItemId: itemId,
        parentId: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: page * size,
      take: size,
    });

    const total = await this.prisma.portfolioComment.count({
      where: { portfolioItemId: itemId, parentId: null },
    });

    return {
      content: comments.map((c) => ({
        id: c.id,
        content: c.content,
        authorId: c.authorId,
        authorName: c.author.name,
        authorAvatar: c.author.avatar,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt?.toISOString() || null,
        likeCount: c.likeCount,
        likedByCurrentUser: false, // TODO: Check if current user liked
        replies: c.replies.map((r) => ({
          id: r.id,
          authorId: r.authorId,
          authorAvatar: r.author.avatar,
          authorName: r.author.name,
          content: r.content,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt?.toISOString() || null,
          likeCount: r.likeCount,
          likedByCurrentUser: false,
        })),
      })),
      page: {
        size,
        number: page,
        totalElements: total,
        totalPages: Math.ceil(total / size),
      },
    };
  }

  async createComment(itemId: string, userId: string, createDto: CreatePortfolioCommentDto) {
    const item = await this.prisma.portfolioItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException('Portfolio item not found');
    }

    if (createDto.parentId) {
      const parent = await this.prisma.portfolioComment.findUnique({
        where: { id: createDto.parentId },
      });

      if (!parent || parent.portfolioItemId !== itemId) {
        throw new BadRequestException('Invalid parent comment');
      }
    }

    const comment = await this.prisma.portfolioComment.create({
      data: {
        content: createDto.content,
        portfolioItemId: itemId,
        authorId: userId,
        parentId: createDto.parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      authorId: comment.authorId,
      authorName: comment.author.name,
      authorAvatar: comment.author.avatar,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt?.toISOString() || null,
      likeCount: 0,
      likedByCurrentUser: false,
      replies: [],
    };
  }

  async updateComment(itemId: string, commentId: string, userId: string, content: string, parentId?: string) {
    const comment = await this.prisma.portfolioComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.portfolioItemId !== itemId) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only update your own comments');
    }

    await this.prisma.portfolioComment.update({
      where: { id: commentId },
      data: {
        content,
        parentId: parentId || null,
      },
    });
  }

  async deleteComment(itemId: string, commentId: string, userId: string) {
    const comment = await this.prisma.portfolioComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.portfolioItemId !== itemId) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.portfolioComment.delete({
      where: { id: commentId },
    });
  }

  async likeComment(itemId: string, commentId: string) {
    // TODO: Implement comment likes
    // This would require a PortfolioCommentLike table
  }

  async unlikeComment(itemId: string, commentId: string) {
    // TODO: Implement comment unlikes
  }

  private getFileType(mimetype: string): string {
    if (mimetype.startsWith('image/')) return 'IMAGE';
    if (mimetype.startsWith('video/')) return 'VIDEO';
    if (mimetype.startsWith('audio/')) return 'AUDIO';
    return 'DESIGN';
  }
}

