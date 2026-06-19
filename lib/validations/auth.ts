import { z } from "zod";

/**
 * Schemas de validación de autenticación (Zod v4).
 * Se validan SIEMPRE del lado del servidor, dentro de las server actions.
 */
export const loginSchema = z.object({
  email: z.email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof loginSchema>;
