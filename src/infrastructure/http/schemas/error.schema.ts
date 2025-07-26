import z from 'zod';

export const errorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
});

export type ErrorSchema = z.infer<typeof errorSchema>;
