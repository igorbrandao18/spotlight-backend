import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
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
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/user.interface';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('projects')
@ApiBearerAuth('JWT-auth')
@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get('list')
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'archived', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('projectId') projectId?: string,
    @Query('archived') archived?: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user?: CurrentUserPayload,
  ) {
    const isArchived = archived === 'true';
    return this.projectsService.findAll(
      projectId || user?.id,
      isArchived,
      pagination,
    );
  }

  @Get('list/colaboration')
  async findCollaborations(@Query('userId') userId: string) {
    return this.projectsService.findCollaborations(userId);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() createProjectDto: CreateProjectDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.projectsService.create(user.id, createProjectDto, file);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('archived') archived?: string) {
    const isArchived = archived === 'true';
    return this.projectsService.findOne(id, isArchived);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  async update(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() updateProjectDto: UpdateProjectDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file?: Express.Multer.File,
  ) {
    return this.projectsService.update(id, user.id, updateProjectDto, file);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.remove(id, user.id);
  }

  @Patch(':id/archive')
  async archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.projectsService.archive(id, user.id);
  }

  @Get(':id/members')
  async getMembers(@Param('id') id: string) {
    return this.projectsService.getMembers(id);
  }

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.projectsService.addMember(id, user.id, addMemberDto);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectsService.removeMember(id, memberId, user.id);
  }

  @Get(':id/milestones')
  async getMilestones(@Param('id') id: string) {
    return this.projectsService.getMilestones(id);
  }

  @Post(':id/milestones')
  async createMilestone(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() createMilestoneDto: CreateMilestoneDto,
  ) {
    return this.projectsService.createMilestone(
      id,
      user.id,
      createMilestoneDto,
    );
  }

  @Put(':id/milestones/:milestoneId')
  async updateMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() updateMilestoneDto: Partial<CreateMilestoneDto>,
  ) {
    return this.projectsService.updateMilestone(
      id,
      milestoneId,
      user.id,
      updateMilestoneDto,
    );
  }

  @Delete(':id/milestones/:milestoneId')
  async deleteMilestone(
    @Param('id') id: string,
    @Param('milestoneId') milestoneId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.projectsService.deleteMilestone(id, milestoneId, user.id);
  }

  @Put(':id/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }), // 20MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.projectsService.uploadImage(id, user.id, file);
  }
}
