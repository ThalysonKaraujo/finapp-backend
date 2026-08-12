import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

@Injectable()
export class ReportsService {
  constructor(
    @Inject('PG_CONNECTION')
    private readonly db: any,
  ) {}

  async getMonthlySummary(userId: string, month: number, year: number) {
    const [result, goalsResult] = await Promise.all([
      this.db.execute(sql`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as incomes,
          COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expenses,
          (COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0)) as balance,
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'categoryId', c.id,
                  'name', c.name,
                  'color', c.color,
                  'total', cat_totals.total
                )
              )
              FROM (
                SELECT category_id, SUM(amount) as total
                FROM transactions t2
                WHERE t2.user_id = ${userId}
                  AND EXTRACT(MONTH FROM t2.date) = ${month}
                  AND EXTRACT(YEAR FROM t2.date) = ${year}
                  AND t2.type = 'EXPENSE'
                  AND t2.category_id IS NOT NULL
                GROUP BY category_id
              ) cat_totals
              JOIN categories c ON c.id = cat_totals.category_id
            ), 
            '[]'::json
          ) as "expensesByCategory"
        FROM transactions t
        WHERE t.user_id = ${userId}
          AND EXTRACT(MONTH FROM t.date) = ${month}
          AND EXTRACT(YEAR FROM t.date) = ${year}
      `),
      this.db.execute(sql`
        SELECT 
          g.category_id as "categoryId",
          c.name,
          c.color,
          g.percentage
        FROM goals g
        JOIN categories c ON c.id = g.category_id
        WHERE g.user_id = ${userId}
      `)
    ]);

    let row: any = null;
    
    if (result && result.length > 0 && result[0]) {
      row = result[0];
    }

    const expensesByCategory = row ? (typeof row.expensesByCategory === 'string' 
      ? JSON.parse(row.expensesByCategory) 
      : row.expensesByCategory || []) : [];

    const goals = (goalsResult || []).map((g: any) => ({
      categoryId: g.categoryId,
      name: g.name,
      color: g.color,
      percentage: Number(g.percentage || 0)
    }));

    return {
      balance: Number(row?.balance || 0),
      incomes: Number(row?.incomes || 0),
      expenses: Number(row?.expenses || 0),
      expensesByCategory: expensesByCategory.map((cat: any) => ({
        ...cat,
        total: Number(cat.total || 0)
      })),
      goals
    };
  }
}
