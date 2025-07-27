import { z } from 'zod';

export const parsedUserSchema = z.object({
  user_id: z.number(),
  name: z.string(),
  orders: z.array(
    z.object({
      order_id: z.number(),
      total: z.string(),
      date: z.string(),
      products: z.array(
        z.object({
          product_id: z.number(),
          product_value: z.string(),
        }),
      ),
    }),
  ),
});

export type ParsedUserSchema = z.infer<typeof parsedUserSchema>;

export const responseUserSchema = z.array(parsedUserSchema);

export type ResultUserSchema = z.infer<typeof responseUserSchema>;
