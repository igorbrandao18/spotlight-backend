import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerStoreDto } from './dto/create-partner-store.dto';
import { CreateEquipmentDto } from './dto/create-equipment.dto';

@Injectable()
export class PartnerStoresService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const stores = await this.prisma.partnerStore.findMany({
      include: {
        equipments: {
          include: {
            images: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return stores.map((store) => ({
      id: store.id,
      name: store.name,
      description: store.description,
      logo: store.logo,
      coverImage: store.coverImage,
      website: store.website,
      email: store.email,
      phone: store.phone,
      address: store.address,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
    }));
  }

  async findOne(id: string) {
    const store = await this.prisma.partnerStore.findUnique({
      where: { id },
      include: {
        equipments: {
          include: {
            images: true,
          },
        },
      },
    });

    if (!store) {
      throw new NotFoundException('Partner store not found');
    }

    return {
      id: store.id,
      name: store.name,
      description: store.description,
      logo: store.logo,
      coverImage: store.coverImage,
      website: store.website,
      email: store.email,
      phone: store.phone,
      address: store.address,
      createdAt: store.createdAt.toISOString(),
      updatedAt: store.updatedAt.toISOString(),
      equipments: store.equipments.map((eq) => ({
        id: eq.id,
        name: eq.name,
        description: eq.description,
        price: eq.price,
        category: eq.category,
        images: eq.images.map((img) => ({
          id: img.id,
          url: img.url,
          key: img.key,
        })),
      })),
    };
  }

  async create(
    createDto: CreatePartnerStoreDto,
    logo?: Express.Multer.File,
    coverImage?: Express.Multer.File,
  ) {
    // TODO: Upload images to S3/Cloudinary
    const logoUrl = logo
      ? `/uploads/stores/logo-${Date.now()}.${logo.originalname.split('.').pop()}`
      : null;
    const coverUrl = coverImage
      ? `/uploads/stores/cover-${Date.now()}.${coverImage.originalname.split('.').pop()}`
      : null;

    const store = await this.prisma.partnerStore.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        website: createDto.website,
        email: createDto.email,
        phone: createDto.phone,
        address: createDto.address,
        logo: logoUrl,
        coverImage: coverUrl,
      },
    });

    return [
      {
        id: store.id,
        name: store.name,
        description: store.description,
        logo: store.logo,
        coverImage: store.coverImage,
        website: store.website,
        email: store.email,
        phone: store.phone,
        address: store.address,
        createdAt: store.createdAt.toISOString(),
        updatedAt: store.updatedAt.toISOString(),
      },
    ];
  }

  async update(
    id: string,
    updateDto: Partial<CreatePartnerStoreDto>,
    logo?: Express.Multer.File,
    coverImage?: Express.Multer.File,
  ) {
    const store = await this.prisma.partnerStore.findUnique({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException('Partner store not found');
    }

    // TODO: Upload images to S3/Cloudinary
    const logoUrl = logo
      ? `/uploads/stores/logo-${Date.now()}.${logo.originalname.split('.').pop()}`
      : undefined;
    const coverUrl = coverImage
      ? `/uploads/stores/cover-${Date.now()}.${coverImage.originalname.split('.').pop()}`
      : undefined;

    const updatedStore = await this.prisma.partnerStore.update({
      where: { id },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        website: updateDto.website,
        email: updateDto.email,
        phone: updateDto.phone,
        address: updateDto.address,
        ...(logoUrl && { logo: logoUrl }),
        ...(coverUrl && { coverImage: coverUrl }),
      },
    });

    return [
      {
        id: updatedStore.id,
        name: updatedStore.name,
        description: updatedStore.description,
        logo: updatedStore.logo,
        coverImage: updatedStore.coverImage,
        website: updatedStore.website,
        email: updatedStore.email,
        phone: updatedStore.phone,
        address: updatedStore.address,
        createdAt: updatedStore.createdAt.toISOString(),
        updatedAt: updatedStore.updatedAt.toISOString(),
      },
    ];
  }

  async remove(id: string) {
    const store = await this.prisma.partnerStore.findUnique({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException('Partner store not found');
    }

    await this.prisma.partnerStore.delete({
      where: { id },
    });
  }

  async uploadStoreImages(
    id: string,
    logo?: Express.Multer.File,
    coverImage?: Express.Multer.File,
  ) {
    const store = await this.prisma.partnerStore.findUnique({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException('Partner store not found');
    }

    // TODO: Upload to S3/Cloudinary
    const logoUrl = logo
      ? `/uploads/stores/${id}/logo-${Date.now()}.${logo.originalname.split('.').pop()}`
      : store.logo;
    const coverUrl = coverImage
      ? `/uploads/stores/${id}/cover-${Date.now()}.${coverImage.originalname.split('.').pop()}`
      : store.coverImage;

    await this.prisma.partnerStore.update({
      where: { id },
      data: {
        logo: logoUrl,
        coverImage: coverUrl,
      },
    });

    return {
      logoUrl,
      coverImageUrl: coverUrl,
    };
  }

  async getEquipments(storeId?: string) {
    const where = storeId ? { partnerStoreId: storeId } : {};
    const equipments = await this.prisma.partnerStoreEquipment.findMany({
      where,
      include: {
        partnerStore: {
          select: {
            id: true,
            name: true,
          },
        },
        images: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return equipments.map((eq) => ({
      id: eq.id,
      name: eq.name,
      description: eq.description,
      price: eq.price,
      category: eq.category,
      partnerStoreId: eq.partnerStoreId,
      partnerStore: eq.partnerStore,
      images: eq.images.map((img) => ({
        id: img.id,
        url: img.url,
        key: img.key,
      })),
      createdAt: eq.createdAt.toISOString(),
      updatedAt: eq.updatedAt.toISOString(),
    }));
  }

  async getEquipment(id: string) {
    const equipment = await this.prisma.partnerStoreEquipment.findUnique({
      where: { id },
      include: {
        partnerStore: {
          select: {
            id: true,
            name: true,
          },
        },
        images: true,
      },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    return {
      id: equipment.id,
      name: equipment.name,
      description: equipment.description,
      price: equipment.price,
      category: equipment.category,
      partnerStoreId: equipment.partnerStoreId,
      partnerStore: equipment.partnerStore,
      images: equipment.images.map((img) => ({
        id: img.id,
        url: img.url,
        key: img.key,
      })),
      createdAt: equipment.createdAt.toISOString(),
      updatedAt: equipment.updatedAt.toISOString(),
    };
  }

  async createEquipment(
    createDto: CreateEquipmentDto,
    files?: Express.Multer.File[],
  ) {
    const store = await this.prisma.partnerStore.findUnique({
      where: { id: createDto.partnerStoreId },
    });

    if (!store) {
      throw new NotFoundException('Partner store not found');
    }

    // TODO: Upload files to S3/Cloudinary
    const imageKeys =
      files?.map((file, index) => ({
        url: `/uploads/equipment/${createDto.partnerStoreId}-${Date.now()}-${index}.${file.originalname.split('.').pop()}`,
        key: `equipment-${createDto.partnerStoreId}-${Date.now()}-${index}`,
      })) || [];

    const equipment = await this.prisma.partnerStoreEquipment.create({
      data: {
        name: createDto.name,
        description: createDto.description,
        price: createDto.price,
        category: createDto.category,
        partnerStoreId: createDto.partnerStoreId,
        images: {
          create: imageKeys,
        },
      },
      include: {
        images: true,
      },
    });

    return [
      {
        id: equipment.id,
        name: equipment.name,
        description: equipment.description,
        price: equipment.price,
        category: equipment.category,
        partnerStoreId: equipment.partnerStoreId,
        images: equipment.images.map((img) => ({
          id: img.id,
          url: img.url,
          key: img.key,
        })),
      },
    ];
  }

  async updateEquipment(id: string, updateDto: Partial<CreateEquipmentDto>) {
    const equipment = await this.prisma.partnerStoreEquipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    const updatedEquipment = await this.prisma.partnerStoreEquipment.update({
      where: { id },
      data: {
        name: updateDto.name,
        description: updateDto.description,
        price: updateDto.price,
        category: updateDto.category,
      },
      include: {
        images: true,
      },
    });

    return {
      id: updatedEquipment.id,
      name: updatedEquipment.name,
      description: updatedEquipment.description,
      price: updatedEquipment.price,
      category: updatedEquipment.category,
      images: updatedEquipment.images.map((img) => ({
        id: img.id,
        url: img.url,
        key: img.key,
      })),
    };
  }

  async removeEquipment(id: string) {
    const equipment = await this.prisma.partnerStoreEquipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    await this.prisma.partnerStoreEquipment.delete({
      where: { id },
    });
  }

  async uploadEquipmentImages(id: string, files: Express.Multer.File[]) {
    const equipment = await this.prisma.partnerStoreEquipment.findUnique({
      where: { id },
    });

    if (!equipment) {
      throw new NotFoundException('Equipment not found');
    }

    // TODO: Upload to S3/Cloudinary
    const imageKeys = files.map((file, index) => ({
      url: `/uploads/equipment/${id}-${Date.now()}-${index}.${file.originalname.split('.').pop()}`,
      key: `equipment-${id}-${Date.now()}-${index}`,
    }));

    await this.prisma.partnerStoreEquipmentImage.createMany({
      data: imageKeys.map((img) => ({
        url: img.url,
        key: img.key,
        equipmentId: id,
      })),
    });
  }

  async deleteEquipmentImage(id: string, key: string) {
    const image = await this.prisma.partnerStoreEquipmentImage.findFirst({
      where: {
        equipmentId: id,
        key,
      },
    });

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    await this.prisma.partnerStoreEquipmentImage.delete({
      where: { id: image.id },
    });
  }
}
