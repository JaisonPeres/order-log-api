import { z } from 'zod';

export const queryOrdersSchema = z.object({
  orderId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type QueryOrdersSchema = z.infer<typeof queryOrdersSchema>;
