import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { user } from '../../auth/auth.schema';
import { wallets } from '../wallets/wallets.schema';
import { categories } from '../categories/categories.schema';

export const transactionTypeEnum = pgEnum('transaction_type', [
  'INCOME',
  'EXPENSE',
]);

export const transactions = pgTable('transactions', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  amount: integer('amount').notNull(), // Em centavos
  type: transactionTypeEnum('type').notNull(),
  title: text('title').notNull(),
  date: timestamp('date').notNull(),

  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  walletId: text('wallet_id').references(() => wallets.id, {
    onDelete: 'set null',
  }),
  categoryId: text('category_id').references(() => categories.id, {
    onDelete: 'set null',
  }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(user, {
    fields: [transactions.userId],
    references: [user.id],
  }),
  wallet: one(wallets, {
    fields: [transactions.walletId],
    references: [wallets.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));
