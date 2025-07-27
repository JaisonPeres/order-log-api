import { z } from 'zod';

export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  value: z.number(),
});

export type ProductSchema = z.infer<typeof productSchema>;
