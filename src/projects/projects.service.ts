import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId?: string, archived?: boolean) {
    const where: any = {};
    
    if (userId) {
      where.ownerId = userId;
    }
    
    if (archived !== undefined) {
      where.archived = archived;
    } else {
      where.archived = false;
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
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
        milestones: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            members: true,
            milestones: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects;
  }

  async findOne(id: string, archived?: boolean) {
    const where: any = { id };
    if (archived !== undefined) {
      where.archived = archived;
    }

    const project = await this.prisma.project.findFirst({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
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
        milestones: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async findCollaborations(userId: string) {
    const projects = await this.prisma.project.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
        archived: false,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
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
        milestones: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return projects;
  }

  async create(userId: string, createProjectDto: CreateProjectDto, file?: Express.Multer.File) {
    const { members, milestones, file: _, ...projectData } = createProjectDto;

    // TODO: Upload image to S3/Cloudinary
    const imageUrl = file
      ? `/uploads/projects/${userId}-${Date.now()}.${file.originalname.split('.').pop()}`
      : null;

    const createData: any = {
      ...projectData,
      image: imageUrl,
      ownerId: userId,
      status: projectData.status || 'TODO',
    };

    if (members && members.length > 0) {
      createData.members = {
        create: members.map((m) => ({
          userId: m.userId,
          role: m.role || 'MEMBER',
        })),
      };
    }

    if (milestones && milestones.length > 0) {
      createData.milestones = {
        create: milestones.map((m, index) => ({
          title: m.title,
          description: m.description,
          dueDate: m.dueDate,
          status: m.status || 'TODO',
          order: m.order ?? index,
        })),
      };
    }

    const project = await this.prisma.project.create({
      data: createData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
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
        milestones: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return project;
  }

  async update(id: string, userId: string, updateProjectDto: UpdateProjectDto, file?: Express.Multer.File) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is owner or admin
    const member = project.members.find((m) => m.userId === userId);
    const isOwner = project.ownerId === userId;
    const isAdmin = member?.role === 'ADMIN' || member?.role === 'OWNER';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to update this project');
    }

    const { members, milestones, file: _, ...projectData } = updateProjectDto;

    // TODO: Upload image to S3/Cloudinary
    const imageUrl = file
      ? `/uploads/projects/${userId}-${Date.now()}.${file.originalname.split('.').pop()}`
      : undefined;

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: {
        ...projectData,
        ...(imageUrl && { image: imageUrl }),
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
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
        milestones: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return updatedProject;
  }

  async remove(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only delete your own projects');
    }

    await this.prisma.project.delete({
      where: { id },
    });
  }

  async archive(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only archive your own projects');
    }

    return this.prisma.project.update({
      where: { id },
      data: { archived: true },
    });
  }

  async getMembers(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const members = await this.prisma.projectMember.findMany({
      where: { projectId },
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

    return members;
  }

  async addMember(projectId: string, userId: string, addMemberDto: AddMemberDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is owner or admin
    const member = project.members.find((m) => m.userId === userId);
    const isOwner = project.ownerId === userId;
    const isAdmin = member?.role === 'ADMIN' || member?.role === 'OWNER';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to add members');
    }

    // Check if user is already a member
    const existingMember = project.members.find((m) => m.userId === addMemberDto.userId);
    if (existingMember) {
      throw new BadRequestException('User is already a member of this project');
    }

    const newMember = await this.prisma.projectMember.create({
      data: {
        projectId,
        userId: addMemberDto.userId,
        role: addMemberDto.role || 'MEMBER',
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

    return newMember;
  }

  async removeMember(projectId: string, memberId: number, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const memberToRemove = project.members.find((m) => m.id === memberId);
    if (!memberToRemove) {
      throw new NotFoundException('Member not found');
    }

    // Check if user is owner or admin
    const member = project.members.find((m) => m.userId === userId);
    const isOwner = project.ownerId === userId;
    const isAdmin = member?.role === 'ADMIN' || member?.role === 'OWNER';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to remove members');
    }

    // Prevent removing owner
    if (memberToRemove.userId === project.ownerId) {
      throw new BadRequestException('Cannot remove project owner');
    }

    await this.prisma.projectMember.delete({
      where: { id: memberId },
    });
  }

  async getMilestones(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const milestones = await this.prisma.projectMilestone.findMany({
      where: { projectId },
      orderBy: {
        order: 'asc',
      },
    });

    return milestones;
  }

  async createMilestone(projectId: string, userId: string, createMilestoneDto: CreateMilestoneDto) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Check if user is owner or admin
    const member = project.members.find((m) => m.userId === userId);
    const isOwner = project.ownerId === userId;
    const isAdmin = member?.role === 'ADMIN' || member?.role === 'OWNER';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to create milestones');
    }

    // Get max order
    const maxOrder = await this.prisma.projectMilestone.aggregate({
      where: { projectId },
      _max: { order: true },
    });

    const milestone = await this.prisma.projectMilestone.create({
      data: {
        projectId,
        title: createMilestoneDto.title,
        description: createMilestoneDto.description,
        dueDate: createMilestoneDto.dueDate ? new Date(createMilestoneDto.dueDate) : null,
        status: createMilestoneDto.status || 'TODO',
        order: createMilestoneDto.order ?? (maxOrder._max.order ?? -1) + 1,
      },
    });

    return milestone;
  }

  async updateMilestone(
    projectId: string,
    milestoneId: number,
    userId: string,
    updateMilestoneDto: Partial<CreateMilestoneDto>,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone || milestone.projectId !== projectId) {
      throw new NotFoundException('Milestone not found');
    }

    // Check if user is owner or admin
    const member = project.members.find((m) => m.userId === userId);
    const isOwner = project.ownerId === userId;
    const isAdmin = member?.role === 'ADMIN' || member?.role === 'OWNER';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to update milestones');
    }

    const updatedMilestone = await this.prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        title: updateMilestoneDto.title,
        description: updateMilestoneDto.description,
        dueDate: updateMilestoneDto.dueDate ? new Date(updateMilestoneDto.dueDate) : undefined,
        status: updateMilestoneDto.status,
        order: updateMilestoneDto.order,
      },
    });

    return updatedMilestone;
  }

  async deleteMilestone(projectId: string, milestoneId: number, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const milestone = await this.prisma.projectMilestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone || milestone.projectId !== projectId) {
      throw new NotFoundException('Milestone not found');
    }

    // Check if user is owner or admin
    const member = project.members.find((m) => m.userId === userId);
    const isOwner = project.ownerId === userId;
    const isAdmin = member?.role === 'ADMIN' || member?.role === 'OWNER';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete milestones');
    }

    await this.prisma.projectMilestone.delete({
      where: { id: milestoneId },
    });
  }

  async uploadImage(projectId: string, userId: string, file: Express.Multer.File) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.ownerId !== userId) {
      throw new ForbiddenException('You can only upload images to your own projects');
    }

    // TODO: Upload image to S3/Cloudinary
    const imageUrl = `/uploads/projects/${userId}-${Date.now()}.${file.originalname.split('.').pop()}`;

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: { image: imageUrl },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
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
        milestones: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return updatedProject;
  }
}

