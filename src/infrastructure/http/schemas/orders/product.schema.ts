import { z } from 'zod';

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number()
});

export type ProductSchema = z.infer<typeof productSchema>;
