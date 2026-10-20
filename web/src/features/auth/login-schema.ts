import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Ingresa tu correo').email('Ingresa un correo válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
