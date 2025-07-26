import { numeric } from "drizzle-orm/pg-core";
import { text } from "drizzle-orm/pg-core";
import { pgTable } from "drizzle-orm/pg-core";
import { orders } from "./orders.schema";
import { primaryKey } from "drizzle-orm/pg-core";

export const orderProducts = pgTable('order_products', {
  orderId: text('order_id').notNull().references(() => orders.id),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  productValue: numeric('product_value', { precision: 10, scale: 2 }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.orderId, t.productId] })
}));


export type OrderProductSelect = typeof orderProducts.$inferSelect;
export type OrderProductInsert = typeof orderProducts.$inferInsert;