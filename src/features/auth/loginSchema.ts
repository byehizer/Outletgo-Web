import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'Ingresá tu correo electrónico').email('Correo electrónico no válido'),
  password: z.string().min(1, 'Ingresá tu contraseña').min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
