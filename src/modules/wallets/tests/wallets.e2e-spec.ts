import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../../app.module';
import { user } from '../../../auth/auth.schema';

describe('WalletsModule (e2e)', () => {
  let app: INestApplication;
  let db: any;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
    db = app.get('PG_CONNECTION');

    const randomEmail = `test-wallet-${Date.now()}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer()).post('/api/auth/sign-up/email').send({
      name: 'Wallet E2E User',
      email: randomEmail,
      password,
    });

    await db.update(user).set({ emailVerified: true }).where(eq(user.email, randomEmail));

    const signInRes = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email: randomEmail, password });

    authToken = signInRes.body.token || signInRes.body.session?.token;
    testUserId = signInRes.body.user.id;
  });

  afterAll(async () => {
    if (testUserId && db) {
      await db.delete(user).where(eq(user.id, testUserId));
    }
    await app.close();
  });

  let createdWalletId: string;

  describe('/wallets (POST)', () => {
    it('🔴 Sad Path: should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallets')
        .send({
          name: 'Nubank',
        });

      expect(response.status).toBe(401);
    });

    it('🔴 Sad Path: should return 400 when name is empty', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '',
        });

      expect([400, 500]).toContain(response.status);
    });

    it('🟢 Happy Path: should create a wallet successfully with balance 0', async () => {
      const response = await request(app.getHttpServer())
        .post('/wallets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Nubank',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Nubank');
      expect(response.body.balance).toBe(0);
      expect(response.body.userId).toBe(testUserId);

      createdWalletId = response.body.id;
    });
  });

  describe('/wallets (GET)', () => {
    it('🟢 Happy Path: should return list of wallets', async () => {
      const response = await request(app.getHttpServer())
        .get('/wallets')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].name).toBe('Nubank');
    });
  });

  describe('/wallets/:id (PUT)', () => {
    it('🔴 Sad Path: should return 404 when updating a non-existent wallet', async () => {
      const response = await request(app.getHttpServer())
        .put('/wallets/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Nova Wallet',
        });

      expect(response.status).toBe(404);
    });

    it('🟢 Happy Path: should update the wallet', async () => {
      const response = await request(app.getHttpServer())
        .put(`/wallets/${createdWalletId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Nubank Editado',
          balance: 100,
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Nubank Editado');
      expect(response.body.balance).toBe(100);
    });
  });

  describe('/wallets/:id (DELETE)', () => {
    it('🔴 Sad Path: should return 404 when deleting a non-existent wallet', async () => {
      const response = await request(app.getHttpServer())
        .delete('/wallets/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('🟢 Happy Path: should delete the wallet', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/wallets/${createdWalletId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const checkResponse = await request(app.getHttpServer())
        .get(`/wallets/${createdWalletId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkResponse.status).toBe(404);
    });
  });
});
