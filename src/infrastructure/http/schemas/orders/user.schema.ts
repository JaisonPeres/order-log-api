import { z } from 'zod';
import { orderSchema } from './order.schema';

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  orders: z.array(orderSchema)
});

export const usersSchema = z.array(userSchema);

export type UserSchema = z.infer<typeof userSchema>;
export type UsersSchema = z.infer<typeof usersSchema>;
