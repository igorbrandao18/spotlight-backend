import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PartnerStoresController } from './partner-stores.controller';
import { PartnerStoresService } from './partner-stores.service';
import { AppModule } from '../app.module';
import { TestHelpers } from '../../test/helpers/test-helpers';
import { PrismaService } from '../prisma/prisma.service';

describe('PartnerStoresController', () => {
  let app: INestApplication;
  let controller: PartnerStoresController;
  let service: PartnerStoresService;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    controller = moduleFixture.get<PartnerStoresController>(PartnerStoresController);
    service = moduleFixture.get<PartnerStoresService>(PartnerStoresService);
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await TestHelpers.cleanup();
    await app.close();
  });

  beforeEach(async () => {
    await TestHelpers.cleanup();

    const admin = await TestHelpers.createUser({ role: 'ADMIN' });
    adminId = admin.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: admin.email,
        password: 'password123',
      });

    adminToken = loginResponse.body.jwtToken;
  });

  describe('POST /api/partner-stores', () => {
    it('should create a partner store (admin only)', () => {
      return request(app.getHttpServer())
        .post('/api/partner-stores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Store',
          description: 'Test description',
          address: '123 Test St',
          phone: '1234567890',
          email: 'store@example.com',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test Store');
        });
    });
  });

  describe('GET /api/partner-stores', () => {
    it('should return list of partner stores', async () => {
      await prisma.partnerStore.create({
        data: {
          name: 'Store 1',
          description: 'Description 1',
          address: 'Address 1',
          phone: '1234567890',
          email: 'store1@example.com',
        },
      });

      return request(app.getHttpServer())
        .get('/api/partner-stores')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /api/partner-stores/:id', () => {
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

      return request(app.getHttpServer())
        .get(`/api/partner-stores/${store.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(store.id);
        });
    });
  });

  describe('POST /api/partner-stores/equipments', () => {
    it('should create equipment (admin only)', async () => {
      const store = await prisma.partnerStore.create({
        data: {
          name: 'Test Store',
          description: 'Test description',
          address: '123 Test St',
          phone: '1234567890',
          email: 'store@example.com',
        },
      });

      return request(app.getHttpServer())
        .post('/api/partner-stores/equipments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partnerStoreId: store.id,
          name: 'Camera Equipment',
          description: 'Professional camera',
          price: 1000,
          available: true,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Camera Equipment');
        });
    });
  });

  describe('GET /api/partner-stores/equipments', () => {
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

      return request(app.getHttpServer())
        .get('/api/partner-stores/equipments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ partnerStoreId: store.id })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});

