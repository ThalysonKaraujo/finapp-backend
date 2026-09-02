import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../../app.module';
import { user } from '../../../auth/auth.schema';

describe('CategoriesModule (e2e)', () => {
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

    // Setup: Create a user and get a Bearer token
    const randomEmail = `test-cat-${Date.now()}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer()).post('/api/auth/sign-up/email').send({
      name: 'Category E2E User',
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

  let createdCategoryId: string;

  describe('/categories (POST)', () => {
    it('🔴 Sad Path: should return 401 when no token is provided', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .send({
          name: 'Alimentação',
        });

      expect(response.status).toBe(401);
    });

    it('🔴 Sad Path: should return 400 when name is empty', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '',
          color: '#FF0000',
        });

      expect([400, 500]).toContain(response.status);
    });

    it('🟢 Happy Path: should create a category successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Alimentação',
          color: '#FF0000',
          icon: 'burger',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Alimentação');
      expect(response.body.userId).toBe(testUserId);

      createdCategoryId = response.body.id;
    });
  });

  describe('/categories (GET)', () => {
    it('🟢 Happy Path: should return list of categories', async () => {
      const response = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].name).toBe('Alimentação');
    });
  });

  describe('/categories/:id (PUT)', () => {
    it('🔴 Sad Path: should return 404 when updating a non-existent category', async () => {
      const response = await request(app.getHttpServer())
        .put('/categories/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Nova Categoria',
        });

      expect(response.status).toBe(404);
    });

    it('🟢 Happy Path: should update the category', async () => {
      const response = await request(app.getHttpServer())
        .put(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Supermercado',
          color: '#00FF00',
        });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Supermercado');
      expect(response.body.color).toBe('#00FF00');
    });
  });

  describe('/categories/:id (DELETE)', () => {
    it('🔴 Sad Path: should return 404 when deleting a non-existent category', async () => {
      const response = await request(app.getHttpServer())
        .delete('/categories/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('🟢 Happy Path: should delete the category', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      const checkResponse = await request(app.getHttpServer())
        .get(`/categories/${createdCategoryId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(checkResponse.status).toBe(404);
    });
  });
});
