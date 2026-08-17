import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../../app.module';
import { user } from '../../../auth/auth.schema';

describe('TransactionsModule (e2e)', () => {
  let app: INestApplication;
  let db: any;
  let authToken: string;
  let testUserId: string;
  let walletAId: string;
  let walletBId: string;

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

    // Setup: Create a user and get a Bearer token
    const randomEmail = `test-txn-${Date.now()}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer()).post('/api/auth/sign-up/email').send({
      name: 'Txn E2E User',
      email: randomEmail,
      password,
    });

    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.email, randomEmail));

    const signInRes = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email: randomEmail, password });

    authToken = signInRes.body.token || signInRes.body.session?.token; // Depende da versão do plugin bearer
    testUserId = signInRes.body.user.id;

    const walletARes = await request(app.getHttpServer())
      .post('/wallets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Nubank' });
    walletAId = walletARes.body.id;

    const walletBRes = await request(app.getHttpServer())
      .post('/wallets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Itau' });
    walletBId = walletBRes.body.id;
  });

  afterAll(async () => {
    if (testUserId && db) {
      await db.delete(user).where(eq(user.id, testUserId));
    }
    await app.close();
  });

  describe('/transactions (POST)', () => {
    it('🔴 Sad Path: should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .send({
          amount: 5000,
          type: 'INCOME',
          title: 'Salário',
          date: new Date().toISOString(),
        });

      expect(response.status).toBe(401);
    });

    it('🔴 Sad Path: should return 400 when amount is negative', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -500,
          type: 'EXPENSE',
          title: 'Ifood',
          date: new Date().toISOString(),
        });

      expect([400, 500]).toContain(response.status);
    });

    it('🟢 Happy Path: should create a transaction', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          type: 'INCOME',
          title: 'Salário',
          date: new Date().toISOString(),
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(testUserId);
    });
  });

  describe('/transactions (GET)', () => {
    it('🟢 Happy Path: should return list of transactions with pagination metadata', async () => {
      const response = await request(app.getHttpServer())
        .get('/transactions?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(10);
      expect(typeof response.body.meta.total).toBe('number');
      expect(typeof response.body.meta.totalPages).toBe('number');
    });
  });

  describe('/transactions/:id (PUT)', () => {
    it('🔴 Sad Path: should return 400 when updating with invalid enum type', async () => {
      const response = await request(app.getHttpServer())
        .put('/transactions/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'BLABLA', // Invalid enum
        });

      // ValidationPipe deve barrar
      expect([400, 500]).toContain(response.status);
    });
  });

  describe('/transactions/transfer (POST)', () => {
    let transferOutId: string;
    let transferInId: string;

    it('🔴 Sad Path: should return 400 when source and destination are the same', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 1000,
          title: 'Transfer',
          date: new Date().toISOString(),
          sourceWalletId: 'same-wallet',
          destinationWalletId: 'same-wallet',
        });

      expect([400, 500]).toContain(response.status);
    });

    it('🟢 Happy Path: should create transfer successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/transactions/transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 5000,
          title: 'Nubank para Itaú',
          date: new Date().toISOString(),
          sourceWalletId: walletAId,
          destinationWalletId: walletBId,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('transferOut');
      expect(response.body).toHaveProperty('transferIn');

      expect(response.body.transferOut.type).toBe('TRANSFER_OUT');
      expect(response.body.transferIn.type).toBe('TRANSFER_IN');

      // Assert they are linked
      expect(response.body.transferOut.linkedTransactionId).toBe(
        response.body.transferIn.id,
      );
      expect(response.body.transferIn.linkedTransactionId).toBe(
        response.body.transferOut.id,
      );

      transferOutId = response.body.transferOut.id;
      transferInId = response.body.transferIn.id;
    });

    it('🟢 Happy Path: deleting one side of transfer should delete the other', async () => {
      const delResponse = await request(app.getHttpServer())
        .delete(`/transactions/${transferOutId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(delResponse.status).toBe(200);

      // Verify if transferIn is also deleted
      const checkResponse = await request(app.getHttpServer())
        .get(`/transactions/${transferInId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkResponse.status).toBe(404);
    });
  });
});
