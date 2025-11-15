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
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PartnerStoresService } from './partner-stores.service';
import { CreatePartnerStoreDto } from './dto/create-partner-store.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('partner-stores')
@ApiBearerAuth('JWT-auth')
@Controller('partner-stores')
@UseGuards(JwtAuthGuard)
export class PartnerStoresController {
  constructor(private readonly partnerStoresService: PartnerStoresService) {}

  @Get()
  async findAll() {
    return this.partnerStoresService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.partnerStoresService.findOne(id);
  }

  @Post()
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @Body() createDto: CreatePartnerStoreDto,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    logo?: Express.Multer.File,
  ) {
    // TODO: Handle coverImage separately
    return this.partnerStoresService.create(createDto, logo);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreatePartnerStoreDto>,
  ) {
    return this.partnerStoresService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.partnerStoresService.remove(id);
  }

  @Post(':id/images')
  @UseInterceptors(FileInterceptor('logo'))
  async uploadStoreImages(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    logo?: Express.Multer.File,
  ) {
    // TODO: Handle coverImage separately
    return this.partnerStoresService.uploadStoreImages(id, logo);
  }

  @Get('equipments')
  async getEquipments(@Query('partnerStoreId') storeId?: string) {
    return this.partnerStoresService.getEquipments(storeId);
  }

  @Get('equipments/:id')
  async getEquipment(@Param('id') id: string) {
    return this.partnerStoresService.getEquipment(id);
  }

  @Post('equipments')
  @UseInterceptors(FilesInterceptor('files', 10))
  async createEquipment(
    @Body() createDto: CreateEquipmentDto,
    @UploadedFiles(
      new ParseFilePipe({
        fileIsRequired: false,
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    files?: Express.Multer.File[],
  ) {
    return this.partnerStoresService.createEquipment(createDto, files);
  }

  @Put('equipments/:id')
  async updateEquipment(
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateEquipmentDto>,
  ) {
    return this.partnerStoresService.updateEquipment(id, updateDto);
  }

  @Delete('equipments/:id')
  async removeEquipment(@Param('id') id: string) {
    return this.partnerStoresService.removeEquipment(id);
  }

  @Post('equipments/:id/images')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadEquipmentImages(
    @Param('id') id: string,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    files: Express.Multer.File[],
  ) {
    return this.partnerStoresService.uploadEquipmentImages(id, files);
  }

  @Delete('equipments/:id/images')
  async deleteEquipmentImage(
    @Param('id') id: string,
    @Query('key') key: string,
  ) {
    return this.partnerStoresService.deleteEquipmentImage(id, key);
  }
}
