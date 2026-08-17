import { integer, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { user } from '../../auth/auth.schema';
import { categories } from '../categories/categories.schema';

export const budgets = pgTable(
  'budgets',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    percentage: integer('percentage').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    // A user can only have one budget per category
    userCategoryUnique: unique().on(table.userId, table.categoryId),
  }),
);
