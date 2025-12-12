import { z } from 'zod';

export const createBoardSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100, 'Le nom est trop long'),
  description: z.string().max(500, 'La description est trop longue').optional(),
  background: z.string().optional(),
  visibility: z.enum(['private', 'public', 'team']).optional(),
});

export type CreateBoardInput = z.infer<typeof createBoardSchema>;
