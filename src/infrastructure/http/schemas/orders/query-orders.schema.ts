import { z } from 'zod';

export const queryOrdersSchema = z.object({
  orderId: z
    .number({
      description: 'To get orders by order ID',
    })
    .optional(),
  startDate: z
    .string({
      description: 'Example: 2020-01-01',
    })
    .optional(),
  endDate: z
    .string({
      description: 'Example: 2020-01-31',
    })
    .optional(),
});

export type QueryOrdersSchema = z.infer<typeof queryOrdersSchema>;
