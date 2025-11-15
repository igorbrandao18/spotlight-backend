import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ChangeAvailabilityDto } from './dto/change-availability.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        socialLinks: true,
        websites: true,
        locations: true,
        availability: true,
        rates: true,
        preferences: true,
        _count: {
          select: {
            followers: true,
            following: true,
            ownedProjects: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      metrics: {
        followers: user._count.followers,
        following: user._count.following,
        projects: user._count.ownedProjects,
        rating: 0, // TODO: Implement rating system
      },
    };
  }

  async searchUsers(search: string, currentUserId?: string) {
    const where = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { areaActivity: { contains: search, mode: 'insensitive' as const } },
            { title: { contains: search, mode: 'insensitive' as const } },
          ],
          enabled: true,
        }
      : { enabled: true };

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        areaActivity: true,
        title: true,
        location: true,
        isPro: true,
        isVerified: true,
        avatar: true,
        coverImage: true,
        metrics: {
          select: {
            followers: true,
            following: true,
            ownedProjects: true,
          },
        },
        bio: true,
        shortBio: true,
        specialties: true,
        website: true,
        socialLinks: true,
        websites: true,
        locations: true,
        profileLevel: true,
        resume: true,
        chatAvailability: true,
        industry: true,
        timeOfExperience: true,
        notableClients: true,
        whatsappNumber: true,
      },
      take: 20,
    });

    // Add follow status if currentUserId is provided
    if (currentUserId) {
      const followRelations = await this.prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: users.map((u) => u.id) },
        },
      });

      const followMap = new Map(
        followRelations.map((f) => [f.followingId, true]),
      );

      return {
        content: users.map((user) => ({
          ...user,
          isFollowing: followMap.has(user.id),
          isFollowed: false, // TODO: Check if user follows current user
          isBlocked: false, // TODO: Implement blocking
        })),
        page: {
          size: 20,
          number: 0,
          totalElements: users.length,
          totalPages: 1,
        },
      };
    }

    return {
      content: users,
      page: {
        size: 20,
        number: 0,
        totalElements: users.length,
        totalPages: 1,
      },
    };
  }

  async getUserPublic(userId: string, currentUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        socialLinks: true,
        websites: true,
        locations: true,
        availability: true,
        rates: true,
        _count: {
          select: {
            followers: true,
            following: true,
            ownedProjects: true,
          },
        },
      },
    });

    if (!user || !user.enabled) {
      throw new NotFoundException('User not found');
    }

    let isFollowing = false;
    let isFollowed = false;

    if (currentUserId) {
      const followRelation = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: userId,
          },
        },
      });
      isFollowing = !!followRelation;

      const followedRelation = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: currentUserId,
          },
        },
      });
      isFollowed = !!followedRelation;
    }

    const { password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      metrics: {
        followers: user._count.followers,
        following: user._count.following,
        projects: user._count.ownedProjects,
        rating: 0,
      },
      isFollowing,
      isFollowed,
      isBlocked: false,
      collaborations: 0, // TODO: Implement collaborations count
    };
  }

  async updateProfile(userId: string, updateDto: UpdateUserProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const {
      socialLinks,
      websites,
      locations,
      availability,
      rates,
      specialties,
      ...userData
    } = updateDto;

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...userData,
        specialties: specialties ? specialties.split(',') : undefined,
      },
      include: {
        socialLinks: true,
        websites: true,
        locations: true,
        availability: true,
        rates: true,
        _count: {
          select: {
            followers: true,
            following: true,
            ownedProjects: true,
          },
        },
      },
    });

    // Update social links
    if (socialLinks) {
      await this.prisma.socialLink.deleteMany({ where: { userId } });
      if (socialLinks.length > 0) {
        await this.prisma.socialLink.createMany({
          data: socialLinks.map((link) => ({ ...link, userId })),
        });
      }
    }

    // Update websites
    if (websites) {
      await this.prisma.website.deleteMany({ where: { userId } });
      if (websites.length > 0) {
        await this.prisma.website.createMany({
          data: websites.map((website) => ({ ...website, userId })),
        });
      }
    }

    // Update locations
    if (locations) {
      await this.prisma.location.deleteMany({ where: { userId } });
      if (locations.length > 0) {
        await this.prisma.location.createMany({
          data: locations.map((location) => ({ ...location, userId })),
        });
      }
    }

    // Update availability
    if (availability) {
      await this.prisma.availability.upsert({
        where: { userId },
        create: { ...availability, userId },
        update: availability,
      });
    }

    // Update rates
    if (rates) {
      await this.prisma.rate.upsert({
        where: { userId },
        create: { ...rates, userId },
        update: rates,
      });
    }

    return this.getMe(userId);
  }

  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const following = await this.prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!following || !following.enabled) {
      throw new NotFoundException('User not found');
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      throw new BadRequestException('Already following this user');
    }

    await this.prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    return this.getUserPublic(followingId, followerId);
  }

  async unfollowUser(followerId: string, followingId: string) {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!follow) {
      throw new NotFoundException('Follow relationship not found');
    }

    await this.prisma.follow.delete({
      where: { id: follow.id },
    });
  }

  async getFollowed(userId?: string) {
    const where = userId ? { followerId: userId } : {};
    const follows = await this.prisma.follow.findMany({
      where,
      include: {
        following: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      take: 20,
    });

    return {
      content: follows.map((f) => ({
        id: f.following.id,
        name: f.following.name,
        avatar: f.following.avatar,
      })),
      page: {
        size: 20,
        number: 0,
        totalElements: follows.length,
        totalPages: 1,
      },
    };
  }

  async getFollowers(userId?: string) {
    const where = userId ? { followingId: userId } : {};
    const follows = await this.prisma.follow.findMany({
      where,
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      take: 20,
    });

    return follows.map((f) => ({
      id: f.follower.id,
      name: f.follower.name,
      avatar: f.follower.avatar,
    }));
  }

  async changeAvailability(userId: string, availability: string) {
    const validStatuses = ['AVAILABLE', 'BUSY', 'AWAY', 'OFFLINE'];
    if (!validStatuses.includes(availability)) {
      throw new BadRequestException('Invalid availability status');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { chatAvailability: availability },
    });

    return this.getMe(userId);
  }

  async disableUser(userId: string, currentUserId: string) {
    // Only admins or the user themselves can disable
    const currentUser = await this.prisma.user.findUnique({
      where: { id: currentUserId },
    });

    if (currentUser?.role !== 'ADMIN' && currentUserId !== userId) {
      throw new ForbiddenException('Not authorized to disable this user');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { enabled: false },
    });
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    // TODO: Implement file upload to S3/Cloudinary
    const avatarUrl = `/uploads/avatars/${userId}-${Date.now()}.${file.originalname.split('.').pop()}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    return this.getMe(userId);
  }

  async uploadCoverImage(userId: string, file: Express.Multer.File) {
    // TODO: Implement file upload to S3/Cloudinary
    const coverUrl = `/uploads/covers/${userId}-${Date.now()}.${file.originalname.split('.').pop()}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { coverImage: coverUrl },
    });

    return this.getMe(userId);
  }

  async uploadResume(userId: string, file: Express.Multer.File) {
    // TODO: Implement file upload to S3/Cloudinary
    const resumeUrl = `/uploads/resumes/${userId}-${Date.now()}.${file.originalname.split('.').pop()}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { resume: resumeUrl },
    });

    return this.getMe(userId);
  }

  async deleteResume(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { resume: null },
    });
  }

  async deleteLocation(userId: string, locationId: number) {
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location || location.userId !== userId) {
      throw new NotFoundException('Location not found');
    }

    await this.prisma.location.delete({
      where: { id: locationId },
    });
  }

  async deleteSocialLink(userId: string, linkId: number) {
    const link = await this.prisma.socialLink.findUnique({
      where: { id: linkId },
    });

    if (!link || link.userId !== userId) {
      throw new NotFoundException('Social link not found');
    }

    await this.prisma.socialLink.delete({
      where: { id: linkId },
    });
  }

  async deleteWebsite(userId: string, websiteId: number) {
    const website = await this.prisma.website.findUnique({
      where: { id: websiteId },
    });

    if (!website || website.userId !== userId) {
      throw new NotFoundException('Website not found');
    }

    await this.prisma.website.delete({
      where: { id: websiteId },
    });
  }

  async getPreferences(userId: string) {
    let preferences = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.prisma.userPreferences.create({
        data: { userId },
      });
    }

    return preferences;
  }

  async updatePreferences(userId: string, preferences: any) {
    return this.prisma.userPreferences.upsert({
      where: { userId },
      create: { ...preferences, userId },
      update: preferences,
    });
  }
}

