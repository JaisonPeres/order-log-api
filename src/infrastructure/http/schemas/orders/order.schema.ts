import { z } from 'zod';
import { productSchema } from './product.schema';

export const orderSchema = z.object({
  id: z.number(),
  date: z.string(),
  products: z.array(productSchema),
  total: z.number(),
});

export type OrderSchema = z.infer<typeof orderSchema>;
