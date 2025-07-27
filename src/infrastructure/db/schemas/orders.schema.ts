import { pgTable, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.schema';

export const orders = pgTable('orders', {
  id: integer('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  orderDate: timestamp('order_date').notNull(),
});

export type OrderSelect = typeof orders.$inferSelect;
export type OrderInsert = typeof orders.$inferInsert;
