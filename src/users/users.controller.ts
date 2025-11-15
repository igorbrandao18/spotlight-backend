import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/interfaces/user.interface';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.usersService.getMe(user.id);
  }

  @Get()
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async searchUsers(
    @Query('search') search: string,
    @Query() pagination: PaginationDto,
    @CurrentUser() user: any,
  ) {
    return this.usersService.searchUsers(search, pagination, user.id);
  }

  @Get(':id/public')
  async getUserPublic(@Param('id') id: string, @CurrentUser() user: any) {
    return this.usersService.getUserPublic(id, user.id);
  }

  @Put('me')
  async updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() updateDto: UpdateUserProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateDto);
  }

  @Post('follow/:id')
  async followUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.followUser(user.id, id);
  }

  @Delete('unfollow/:id')
  async unfollowUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.unfollowUser(user.id, id);
  }

  @Get('followed')
  async getFollowed(@Query('userId') userId?: string) {
    return this.usersService.getFollowed(userId);
  }

  @Get('followers')
  async getFollowers(@Query('userId') userId?: string) {
    return this.usersService.getFollowers(userId);
  }

  @Put('me/:availability')
  async changeAvailability(
    @CurrentUser() user: CurrentUserPayload,
    @Param('availability') availability: string,
  ) {
    return this.usersService.changeAvailability(user.id, availability);
  }

  @Delete(':id/disable')
  async disableUser(@CurrentUser() user: any, @Param('id') id: string) {
    return this.usersService.disableUser(id, user.id);
  }

  @Put('me/images')
  @UseInterceptors(FileInterceptor('avatarFile'))
  async uploadAvatar(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadAvatar(user.id, file);
  }

  @Put('me/images')
  @UseInterceptors(FileInterceptor('coverFile'))
  async uploadCoverImage(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadCoverImage(user.id, file);
  }

  @Post('me/resume')
  @UseInterceptors(FileInterceptor('resumeFile'))
  async uploadResume(
    @CurrentUser() user: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.uploadResume(user.id, file);
  }

  @Delete('me/resume')
  async deleteResume(@CurrentUser() user: any) {
    return this.usersService.deleteResume(user.id);
  }

  @Delete('me/locations/:id')
  async deleteLocation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteLocation(user.id, id);
  }

  @Delete('me/social/:id')
  async deleteSocialLink(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteSocialLink(user.id, id);
  }

  @Delete('me/websites/:id')
  async deleteWebsite(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteWebsite(user.id, id);
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: any) {
    return this.usersService.getPreferences(user.id);
  }

  @Put('preferences')
  async updatePreferences(@CurrentUser() user: any, @Body() preferences: any) {
    return this.usersService.updatePreferences(user.id, preferences);
  }
}
