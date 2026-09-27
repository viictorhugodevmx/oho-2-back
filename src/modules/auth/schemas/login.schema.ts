import bcrypt from "bcryptjs";
import { z } from "zod";

export const loginSchema = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    password: z
      .string()
      .min(1, "La contraseña es obligatoria.")
      .refine(
        (value) => !bcrypt.truncates(value),
        "La contraseña supera el límite de 72 bytes.",
      ),
  })
  .strict();

export type LoginInput = z.infer<typeof loginSchema>;
