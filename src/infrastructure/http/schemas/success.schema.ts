import z from 'zod';

export const successSchema = z.object({
  success: z.boolean().default(true),
  message: z.string().optional(),
});

export type SuccessSchema = z.infer<typeof successSchema>;

// Empty success schema for 200 OK responses with no body
export const emptySuccessSchema = z.object({}).describe('Success');
