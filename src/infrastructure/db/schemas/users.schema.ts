import { integer } from 'drizzle-orm/pg-core';
import { text } from 'drizzle-orm/pg-core';
import { pgTable } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

export type UserSelect = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
