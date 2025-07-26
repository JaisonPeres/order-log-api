import { z } from 'zod';

export const uploadFileSchema = z.string().min(1, 'File content is required');

export type UploadFileSchema = z.infer<typeof uploadFileSchema>;
