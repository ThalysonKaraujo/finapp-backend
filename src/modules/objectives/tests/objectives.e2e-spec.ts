import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../../app.module';
import { user } from '../../../auth/auth.schema';
import { objectives } from '../objectives.schema';

describe('ObjectivesModule (e2e)', () => {
  let app: INestApplication;
  let db: any;
  let authToken: string;
  let testUserId: string;
  let objectiveId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    db = app.get('PG_CONNECTION');

    const randomEmail = `test-obj-${Date.now()}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer()).post('/api/auth/sign-up/email').send({
      name: 'Objective User',
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

    authToken = signInRes.body.token || signInRes.body.session?.token;
    testUserId = signInRes.body.user.id;
  });

  afterAll(async () => {
    if (testUserId && db) {
      await db.delete(user).where(eq(user.id, testUserId));
    }
    await app.close();
  });

  describe('/objectives (POST)', () => {
    it('should create a new objective', async () => {
      const res = await request(app.getHttpServer())
        .post('/objectives')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Carro Novo',
          targetAmount: 5000000,
          color: '#000000',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.currentAmount).toBe(0);
      objectiveId = res.body.id;
    });
  });

  describe('/objectives/:id/deposit (POST)', () => {
    it('should deposit money into the objective', async () => {
      const res = await request(app.getHttpServer())
        .post(`/objectives/${objectiveId}/deposit`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 100000, // deposit 1.000,00
        });

      expect(res.status).toBe(201);
      expect(res.body.currentAmount).toBe(100000);
    });
  });

  describe('/objectives/:id/withdraw (POST)', () => {
    it('should withdraw money from the objective', async () => {
      const res = await request(app.getHttpServer())
        .post(`/objectives/${objectiveId}/withdraw`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 50000, // withdraw 500,00
        });

      expect(res.status).toBe(201);
      expect(res.body.currentAmount).toBe(50000); // 1.000,00 - 500,00 = 500,00
    });

    it('should fail to withdraw more than currentAmount', async () => {
      const res = await request(app.getHttpServer())
        .post(`/objectives/${objectiveId}/withdraw`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 60000,
        });

      expect(res.status).toBe(400);
    });
  });

  describe('/objectives (GET)', () => {
    it('should return all objectives', async () => {
      const res = await request(app.getHttpServer())
        .get('/objectives')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].id).toBe(objectiveId);
    });
  });

  describe('/objectives/:id (DELETE)', () => {
    it('should delete the objective', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/objectives/${objectiveId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // Verify deletion
      const checkRes = await request(app.getHttpServer())
        .get('/objectives')
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkRes.body.length).toBe(0);
    });
  });
});
