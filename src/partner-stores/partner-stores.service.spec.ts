import { Test, TestingModule } from '@nestjs/testing';
import { PartnerStoresService } from './partner-stores.service';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { NotFoundException } from '@nestjs/common';

describe('PartnerStoresService', () => {
  let service: PartnerStoresService;
  let prisma: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    service = module.get<PartnerStoresService>(PartnerStoresService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await module.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();
  });

  describe('create', () => {
    it('should create a partner store', async () => {
      const admin = await TestHelpers.createUser({ role: 'ADMIN' });

      const createDto = {
        name: 'Test Store',
        description: 'Test description',
        address: '123 Test St',
        phone: '1234567890',
        email: 'store@example.com',
      };

      const result = await service.create(admin.id, createDto);

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(createDto.name);

      const store = await prisma.partnerStore.findUnique({
        where: { id: result.id },
      });
      expect(store).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return list of partner stores', async () => {
      await TestHelpers.createUser({ role: 'ADMIN' });

      await prisma.partnerStore.create({
        data: {
          name: 'Store 1',
          description: 'Description 1',
          address: 'Address 1',
          phone: '1234567890',
          email: 'store1@example.com',
        },
      });

      await prisma.partnerStore.create({
        data: {
          name: 'Store 2',
          description: 'Description 2',
          address: 'Address 2',
          phone: '0987654321',
          email: 'store2@example.com',
        },
      });

      const result = await service.findAll({});

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('findOne', () => {
    it('should return a partner store by id', async () => {
      const store = await prisma.partnerStore.create({
        data: {
          name: 'Test Store',
          description: 'Test description',
          address: '123 Test St',
          phone: '1234567890',
          email: 'store@example.com',
        },
      });

      const result = await service.findOne(store.id);

      expect(result).toBeDefined();
      expect(result.id).toBe(store.id);
    });

    it('should throw NotFoundException if store not found', async () => {
      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createEquipment', () => {
    it('should create equipment for a store', async () => {
      const admin = await TestHelpers.createUser({ role: 'ADMIN' });
      const store = await prisma.partnerStore.create({
        data: {
          name: 'Test Store',
          description: 'Test description',
          address: '123 Test St',
          phone: '1234567890',
          email: 'store@example.com',
        },
      });

      const equipmentDto = {
        name: 'Camera Equipment',
        description: 'Professional camera',
        price: 1000,
        available: true,
      };

      const result = await service.createEquipment(
        admin.id,
        store.id,
        equipmentDto,
      );

      expect(result).toHaveProperty('id');
      expect(result.name).toBe(equipmentDto.name);

      const equipment = await prisma.partnerStoreEquipment.findUnique({
        where: { id: result.id },
      });
      expect(equipment).toBeDefined();
      expect(equipment.partnerStoreId).toBe(store.id);
    });
  });

  describe('findAllEquipment', () => {
    it('should return list of equipment', async () => {
      const store = await prisma.partnerStore.create({
        data: {
          name: 'Test Store',
          description: 'Test description',
          address: '123 Test St',
          phone: '1234567890',
          email: 'store@example.com',
        },
      });

      await prisma.partnerStoreEquipment.create({
        data: {
          name: 'Equipment 1',
          partnerStoreId: store.id,
          price: 1000,
          available: true,
        },
      });

      const result = await service.findAllEquipment({
        partnerStoreId: store.id,
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });
});
