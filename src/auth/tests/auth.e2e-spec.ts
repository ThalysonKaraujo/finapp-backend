import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { describe, beforeAll, it, expect, afterAll } from 'vitest';

describe('AuthModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // Usamos um e-mail randômico para evitar conflito caso o teste rode várias vezes no mesmo banco local
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
    expect(response.body).toHaveProperty('session');
    expect(response.body.session).toHaveProperty('token');
    expect(response.body.user.email).toBe(randomEmail);
  });

  it('/api/auth/sign-in/email (POST) - should fail with wrong password', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({
        email: randomEmail,
        password: 'wrong-password',
      });

    // 401 Unauthorized ou erro customizado do Better Auth (403/400)
    expect([401, 403, 400]).toContain(response.status);
  });
});
