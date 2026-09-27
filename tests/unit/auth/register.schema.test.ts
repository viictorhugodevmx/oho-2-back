import { describe, expect, it } from "vitest";

import { registerSchema } from "../../../src/modules/auth/schemas/register.schema.js";

describe("registerSchema", () => {
  it("normaliza el nombre completo y el correo", () => {
    const result = registerSchema.parse({
      name: "  Víctor   Hugo Segundo Aguilar  ",
      email: "  VICTOR@EXAMPLE.COM  ",
      password: "OhoDemo20",
    });

    expect(result.name).toBe("Víctor Hugo Segundo Aguilar");
    expect(result.email).toBe("victor@example.com");
  });

  it("rechaza un nombre incompleto y un correo inválido", () => {
    expect(
      registerSchema.safeParse({
        name: "Víctor",
        email: "victor@example.com",
        password: "OhoDemo20",
      }).success,
    ).toBe(false);

    expect(
      registerSchema.safeParse({
        name: "Víctor Aguilar",
        email: "correo-invalido",
        password: "OhoDemo20",
      }).success,
    ).toBe(false);
  });

  it("rechaza contraseñas demasiado cortas o superiores a 72 bytes", () => {
    for (const password of ["corta", "🔒".repeat(19)]) {
      expect(
        registerSchema.safeParse({
          name: "Víctor Aguilar",
          email: "victor@example.com",
          password,
        }).success,
      ).toBe(false);
    }
  });
});
