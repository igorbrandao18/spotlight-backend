import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateReactionDto } from './dto/create-reaction.dto';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: string) {
    const posts = await this.prisma.post.findMany({
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Get user reactions for each post
    let userReactions: Record<string, string> = {};
    if (userId) {
      const reactions = await this.prisma.postReaction.findMany({
        where: {
          userId,
          postId: { in: posts.map((p) => p.id) },
        },
        select: {
          postId: true,
          type: true,
        },
      });
      userReactions = Object.fromEntries(
        reactions.map((r) => [r.postId, r.type]),
      );
    }

    return posts.map((post) => ({
      id: post.id,
      content: post.content,
      description: post.description,
      equipment: post.equipment,
      location: post.location,
      software: post.software,
      image: post.image,
      authorId: post.authorId,
      author: post.author,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      commentsCount: post._count.comments,
      reactionsCount: post._count.reactions,
      userReaction: userReactions[post.id] || null,
    }));
  }

  async findOne(id: string, userId?: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    let userReaction = null;
    if (userId) {
      const reaction = await this.prisma.postReaction.findUnique({
        where: {
          postId_userId: {
            postId: id,
            userId,
          },
        },
      });
      userReaction = reaction?.type || null;
    }

    return {
      ...post,
      commentsCount: post._count.comments,
      reactionsCount: post._count.reactions,
      userReaction,
    };
  }

  async create(userId: string, createPostDto: CreatePostDto, image?: Express.Multer.File) {
    // TODO: Upload image to S3/Cloudinary
    const imageUrl = image
      ? `/uploads/posts/${userId}-${Date.now()}.${image.originalname.split('.').pop()}`
      : null;

    const post = await this.prisma.post.create({
      data: {
        content: createPostDto.content,
        description: createPostDto.description,
        equipment: createPostDto.equipment,
        location: createPostDto.location,
        software: createPostDto.software,
        image: imageUrl,
        authorId: userId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    return {
      ...post,
      commentsCount: 0,
      reactionsCount: 0,
    };
  }

  async update(id: string, userId: string, updatePostDto: UpdatePostDto, image?: Express.Multer.File) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only update your own posts');
    }

    // TODO: Upload image to S3/Cloudinary
    const imageUrl = image
      ? `/uploads/posts/${userId}-${Date.now()}.${image.originalname.split('.').pop()}`
      : undefined;

    const updatedPost = await this.prisma.post.update({
      where: { id },
      data: {
        content: updatePostDto.content,
        description: updatePostDto.description,
        equipment: updatePostDto.equipment,
        location: updatePostDto.location,
        software: updatePostDto.software,
        ...(imageUrl && { image: imageUrl }),
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            comments: true,
            reactions: true,
          },
        },
      },
    });

    return {
      ...updatedPost,
      commentsCount: updatedPost._count.comments,
      reactionsCount: updatedPost._count.reactions,
    };
  }

  async remove(id: string, userId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts');
    }

    await this.prisma.post.delete({
      where: { id },
    });
  }

  async getComments(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const comments = await this.prisma.postComment.findMany({
      where: {
        postId,
        parentId: null, // Only top-level comments
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
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return comments;
  }

  async createComment(postId: string, userId: string, createCommentDto: CreateCommentDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Validate parent comment if provided
    if (createCommentDto.parentId) {
      const parentComment = await this.prisma.postComment.findUnique({
        where: { id: createCommentDto.parentId },
      });

      if (!parentComment || parentComment.postId !== postId) {
        throw new BadRequestException('Invalid parent comment');
      }
    }

    const comment = await this.prisma.postComment.create({
      data: {
        content: createCommentDto.content,
        postId,
        authorId: userId,
        parentId: createCommentDto.parentId || null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        replies: true,
      },
    });

    return comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.postComment.delete({
      where: { id: commentId },
    });
  }

  async getReactions(postId: string) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const reactions = await this.prisma.postReaction.findMany({
      where: { postId },
      include: {
        user: {
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
    });

    return reactions;
  }

  async createReaction(postId: string, userId: string, createReactionDto: CreateReactionDto) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if user already reacted
    const existingReaction = await this.prisma.postReaction.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingReaction) {
      // Update existing reaction
      const reaction = await this.prisma.postReaction.update({
        where: { id: existingReaction.id },
        data: { type: createReactionDto.type },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });
      return reaction;
    }

    // Create new reaction
    const reaction = await this.prisma.postReaction.create({
      data: {
        type: createReactionDto.type,
        postId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return reaction;
  }

  async deleteReaction(postId: string, userId: string) {
    const reaction = await this.prisma.postReaction.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.prisma.postReaction.delete({
      where: { id: reaction.id },
    });
  }
}

