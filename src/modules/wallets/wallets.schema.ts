import { relations } from 'drizzle-orm';
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from '../../auth/auth.schema';

export const wallets = pgTable('wallets', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  balance: integer('balance').default(0).notNull(), // Em centavos
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(user, {
    fields: [wallets.userId],
    references: [user.id],
  }),
}));
