import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../../app.module';
import { user } from '../../../auth/auth.schema';

describe('GoalsModule (e2e)', () => {
  let app: INestApplication;
  let db: any;
  let authToken: string;
  let testUserId: string;
  let cat1: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    db = app.get('PG_CONNECTION');

    const randomEmail = `test-goal-${Date.now()}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer()).post('/api/auth/sign-up/email').send({
      name: 'Goal E2E User',
      email: randomEmail,
      password,
    });

    const signInRes = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email: randomEmail, password });

    authToken = signInRes.body.token || signInRes.body.session?.token;
    testUserId = signInRes.body.user.id;

    const cat1Res = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Alimentação', color: '#FF0000' });
    cat1 = cat1Res.body.id;
  });

  afterAll(async () => {
    if (testUserId && db) {
      await db.delete(user).where(eq(user.id, testUserId));
    }
    await app.close();
  });

  let createdGoalId: string;

  describe('/goals (POST)', () => {
    it('🔴 Sad Path: should fail if category is not provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ percentage: 30 });
      expect(res.status).toBe(400);
    });

    it('🟢 Happy Path: should create a goal', async () => {
      const res = await request(app.getHttpServer())
        .post('/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId: cat1, percentage: 80 });

      expect(res.status).toBe(201);
      expect(res.body.percentage).toBe(80);
      createdGoalId = res.body.id;
    });

    it('🔴 Sad Path: should prevent creating another goal that exceeds 100%', async () => {
      const cat2Res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Lazer', color: '#0000FF' });

      const res = await request(app.getHttpServer())
        .post('/goals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categoryId: cat2Res.body.id, percentage: 30 }); // 80 + 30 = 110

      expect(res.status).toBe(400);
    });
  });

  describe('/goals (GET)', () => {
    it('🟢 Happy Path: should return list of goals', async () => {
      const res = await request(app.getHttpServer())
        .get('/goals')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
    });
  });

  describe('/goals/:id (PUT)', () => {
    it('🔴 Sad Path: should prevent updating if it exceeds 100%', async () => {
      const res = await request(app.getHttpServer())
        .put(`/goals/${createdGoalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ percentage: 110 });

      expect(res.status).toBe(400);
    });

    it('🟢 Happy Path: should update the goal', async () => {
      const res = await request(app.getHttpServer())
        .put(`/goals/${createdGoalId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ percentage: 90 }); // Updating 80 to 90 is fine (total 90)

      expect(res.status).toBe(200);
      expect(res.body.percentage).toBe(90);
    });
  });

  describe('/goals/:id (DELETE)', () => {
    it('🟢 Happy Path: should delete the goal', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/goals/${createdGoalId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
    });
  });
});
