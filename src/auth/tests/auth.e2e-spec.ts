import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { user } from '../auth.schema';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;
  let db: any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get('PG_CONNECTION');
  });

  afterAll(async () => {
    await app.close();
  });

  const randomEmail = `test-${Date.now()}@example.com`;
  const password = 'senha-super-forte';

  it('/api/auth/sign-up/email (POST) - should create a new user', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-up/email')
      .send({
        name: 'Test E2E User',
        email: randomEmail,
        password: password,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(randomEmail);
    expect(response.body.user.name).toBe('Test E2E User');

    // Bypass email verification for following tests
    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.email, randomEmail));
  });

  it('/api/auth/sign-in/email (POST) - should login existing user and return session', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({
        email: randomEmail,
        password: password,
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(randomEmail);
  });

  it('/api/auth/sign-in/email (POST) - should fail with wrong password', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({
        email: randomEmail,
        password: 'wrong-password',
      });

    expect([401, 403, 400]).toContain(response.status);
    expect(response.body.message).toEqual('Invalid email or password');
    expect(response.body.code).toEqual('INVALID_EMAIL_OR_PASSWORD');
  });
});
