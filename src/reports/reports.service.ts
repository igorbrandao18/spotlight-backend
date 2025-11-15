import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const reports = await this.prisma.report.findMany({
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return reports;
  }

  async findOne(id: string) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    return report;
  }

  async create(userId: string, createDto: CreateReportDto) {
    // Validate that at least one reported entity is provided
    if (
      !createDto.reportedUserId &&
      !createDto.reportedProjectId &&
      !createDto.reportedPortfolioItemId
    ) {
      throw new Error('At least one reported entity must be provided');
    }

    await this.prisma.report.create({
      data: {
        reason: createDto.reason,
        category: createDto.category,
        reportedUserId: createDto.reportedUserId || null,
        reportedProjectId: createDto.reportedProjectId || null,
        reportedPortfolioItemId: createDto.reportedPortfolioItemId || null,
        reporterId: userId,
        status: 'PENDING',
      },
    });

    return {
      message: 'Report created successfully',
    };
  }

  async update(id: string, updateDto: UpdateReportDto) {
    const report = await this.prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updatedReport = await this.prisma.report.update({
      where: { id },
      data: {
        conclusion: updateDto.conclusion,
        status: updateDto.status,
      },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        reportedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return updatedReport;
  }
}
