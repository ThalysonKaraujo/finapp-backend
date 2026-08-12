import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../../app.module';
import { user } from '../../../auth/auth.schema';

describe('ReportsModule (e2e)', () => {
  let app: INestApplication;
  let db: any;
  let authToken: string;
  let testUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    db = app.get('PG_CONNECTION');

    // 1. Create User
    const randomEmail = `test-report-${Date.now()}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer()).post('/api/auth/sign-up/email').send({
      name: 'Report E2E User',
      email: randomEmail,
      password,
    });

    const signInRes = await request(app.getHttpServer())
      .post('/api/auth/sign-in/email')
      .send({ email: randomEmail, password });

    authToken = signInRes.body.token || signInRes.body.session?.token;
    testUserId = signInRes.body.user.id;

    // 2. Setup Data (Categories)
    const cat1Res = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Alimentação', color: '#FF0000' });
    const cat1 = cat1Res.body.id;

    const cat2Res = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Transporte', color: '#00FF00' });
    const cat2 = cat2Res.body.id;

    // 3. Setup Data (Transactions for 08/2026)
    const txns = [
      { amount: 50000, type: 'INCOME', title: 'Salario', date: '2026-08-05T10:00:00.000Z' }, // 500.00 Income
      { amount: 15000, type: 'INCOME', title: 'Freela', date: '2026-08-15T10:00:00.000Z' }, // 150.00 Income
      { amount: 20000, type: 'EXPENSE', title: 'Mercado', date: '2026-08-10T10:00:00.000Z', categoryId: cat1 }, // 200.00 Expense
      { amount: 5000, type: 'EXPENSE', title: 'Ifood', date: '2026-08-12T10:00:00.000Z', categoryId: cat1 }, // 50.00 Expense
      { amount: 10000, type: 'EXPENSE', title: 'Uber', date: '2026-08-14T10:00:00.000Z', categoryId: cat2 }, // 100.00 Expense
      // Transaction in another month (should be ignored by the report)
      { amount: 99999, type: 'EXPENSE', title: 'Outro Mes', date: '2026-09-01T10:00:00.000Z' },
    ];

    for (const t of txns) {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${authToken}`)
        .send(t);
    }
  });

  afterAll(async () => {
    if (testUserId && db) {
      await db.delete(user).where(eq(user.id, testUserId));
    }
    await app.close();
  });

  describe('/reports/monthly (GET)', () => {
    it('🔴 Sad Path: should return 400 if month or year is missing or invalid', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/monthly')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(res.status).toBe(400);

      const res2 = await request(app.getHttpServer())
        .get('/reports/monthly?month=15&year=2026')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res2.status).toBe(400);
    });

    it('🟢 Happy Path: should aggregate incomes, expenses and balance for 08/2026', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/monthly?month=8&year=2026')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // Incomes: 50000 + 15000 = 65000
      // Expenses: 20000 + 5000 + 10000 = 35000
      // Balance: 65000 - 35000 = 30000

      expect(res.body.incomes).toBe(65000);
      expect(res.body.expenses).toBe(35000);
      expect(res.body.balance).toBe(30000);
    });

    it('🟢 Happy Path: should group expenses by category correctly', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/monthly?month=8&year=2026')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      const cats = res.body.expensesByCategory;
      expect(Array.isArray(cats)).toBe(true);
      expect(cats.length).toBe(2);

      // find Alimentacao
      const alimentacao = cats.find((c: any) => c.name === 'Alimentação');
      expect(alimentacao).toBeDefined();
      expect(alimentacao.total).toBe(25000); // 20000 + 5000

      // find Transporte
      const transporte = cats.find((c: any) => c.name === 'Transporte');
      expect(transporte).toBeDefined();
      expect(transporte.total).toBe(10000);
    });
    
    it('🟢 Happy Path: should return zeros for a month with no data', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/monthly?month=1&year=2020')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.incomes).toBe(0);
      expect(res.body.expenses).toBe(0);
      expect(res.body.balance).toBe(0);
      expect(res.body.expensesByCategory.length).toBe(0);
    });
  });
});
