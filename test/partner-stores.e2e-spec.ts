import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestHelpers } from './helpers/test-helpers';

describe('Partner Stores E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let adminId: string;
  let storeId: string;
  let equipmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();
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

  describe('Complete Partner Store Flow', () => {
    it('should complete full partner store and equipment flow', async () => {
      // 1. Create partner store
      const storeResponse = await request(app.getHttpServer())
        .post('/api/partner-stores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Store',
          description: 'Test description',
          address: '123 Test St',
          phone: '1234567890',
          email: 'store@example.com',
        })
        .expect(201);

      storeId = storeResponse.body.id;
      expect(storeResponse.body.name).toBe('Test Store');

      // 2. Get partner store
      const getStoreResponse = await request(app.getHttpServer())
        .get(`/api/partner-stores/${storeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getStoreResponse.body.id).toBe(storeId);

      // 3. Update partner store
      const updateStoreResponse = await request(app.getHttpServer())
        .put(`/api/partner-stores/${storeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Store Name',
          description: 'Updated description',
        })
        .expect(200);

      expect(updateStoreResponse.body.name).toBe('Updated Store Name');

      // 4. Create equipment
      const equipmentResponse = await request(app.getHttpServer())
        .post('/api/partner-stores/equipments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partnerStoreId: storeId,
          name: 'Camera Equipment',
          description: 'Professional camera',
          price: 1000,
          available: true,
        })
        .expect(201);

      equipmentId = equipmentResponse.body.id;
      expect(equipmentResponse.body.name).toBe('Camera Equipment');

      // 5. Get equipment
      const getEquipmentResponse = await request(app.getHttpServer())
        .get(`/api/partner-stores/equipments/${equipmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(getEquipmentResponse.body.id).toBe(equipmentId);

      // 6. List equipment by store
      const listEquipmentResponse = await request(app.getHttpServer())
        .get('/api/partner-stores/equipments')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ partnerStoreId: storeId })
        .expect(200);

      expect(Array.isArray(listEquipmentResponse.body)).toBe(true);
      expect(listEquipmentResponse.body.some((e: any) => e.id === equipmentId)).toBe(true);

      // 7. Update equipment
      const updateEquipmentResponse = await request(app.getHttpServer())
        .put(`/api/partner-stores/equipments/${equipmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Equipment Name',
          price: 1500,
        })
        .expect(200);

      expect(updateEquipmentResponse.body.name).toBe('Updated Equipment Name');
      expect(updateEquipmentResponse.body.price).toBe(1500);

      // 8. List all stores
      const listStoresResponse = await request(app.getHttpServer())
        .get('/api/partner-stores')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(listStoresResponse.body)).toBe(true);
      expect(listStoresResponse.body.some((s: any) => s.id === storeId)).toBe(true);

      // 9. Delete equipment
      await request(app.getHttpServer())
        .delete(`/api/partner-stores/equipments/${equipmentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 10. Delete store
      await request(app.getHttpServer())
        .delete(`/api/partner-stores/${storeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });
});

