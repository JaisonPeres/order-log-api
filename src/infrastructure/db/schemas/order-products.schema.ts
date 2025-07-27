import { text } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';
import { orders } from './orders.schema';
import { primaryKey } from 'drizzle-orm/pg-core';
import { integer } from 'drizzle-orm/pg-core';

export const orderProducts = pgTable(
  'order_products',
  {
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id),
    productId: integer('product_id').notNull(),
    productName: text('product_name').notNull(),
    productValue: integer('product_value').notNull(), // in cents
  },
  (t) => [primaryKey({ columns: [t.orderId, t.productId] })],
);

export type OrderProductSelect = typeof orderProducts.$inferSelect;
export type OrderProductInsert = typeof orderProducts.$inferInsert;
