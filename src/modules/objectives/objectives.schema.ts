import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from '../../auth/auth.schema';

export const objectives = pgTable('objectives', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  targetAmount: integer('target_amount').notNull(),
  currentAmount: integer('current_amount').notNull().default(0),
  color: text('color').notNull(),
  deadline: timestamp('deadline'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
