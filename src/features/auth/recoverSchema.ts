import { z } from 'zod';

export const recoverSchema = z.object({
  email: z.string().min(1, 'Ingresá tu correo electrónico').email('Correo electrónico no válido'),
});

export type RecoverFormValues = z.infer<typeof recoverSchema>;
