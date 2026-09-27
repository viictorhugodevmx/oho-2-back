import bcrypt from "bcryptjs";
import { z } from "zod";

function hasValidNameParts(value: string): boolean {
  const [firstName = "", ...lastNameParts] = value.split(/\s+/u);
  const lastName = lastNameParts.join(" ");

  return (
    firstName.length >= 2 &&
    firstName.length <= 80 &&
    lastName.length >= 2 &&
    lastName.length <= 120
  );
}

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3)
      .max(201)
      .refine(
        (value) => value.split(/\s+/u).length >= 2,
        "Ingresa nombre y apellido.",
      )
      .refine(
        hasValidNameParts,
        "El nombre o los apellidos son demasiado largos.",
      )
      .transform((value) => value.replace(/\s+/gu, " ")),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z
      .string()
      .min(8)
      .refine(
        (value) => !bcrypt.truncates(value),
        "La contraseña supera el límite de 72 bytes.",
      ),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
