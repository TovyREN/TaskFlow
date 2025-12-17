import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères').optional(),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  // ADD better regex for strong password if needed
});

export const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
