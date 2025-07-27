import { z } from 'zod';

export const uploadFileSchema = z
  .string({
    description:
      'File content, with `userId`, `userName`, `orderId`, `productId`, `amount` and `date` in plain text',
  })
  .min(1, 'File content is required');

export type UploadFileSchema = z.infer<typeof uploadFileSchema>;
