import { describe, expect, it } from "vitest";

import { loginSchema } from "../../../src/modules/auth/schemas/login.schema.js";

describe("loginSchema", () => {
  it("normaliza el correo y conserva la contraseña", () => {
    const result = loginSchema.parse({
      email: "  VICTOR@EXAMPLE.COM ",
      password: "password-seguro",
    });

    expect(result).toEqual({
      email: "victor@example.com",
      password: "password-seguro",
    });
  });

  it("rechaza un correo inválido o una contraseña vacía", () => {
    expect(() =>
      loginSchema.parse({
        email: "correo-invalido",
        password: "",
      }),
    ).toThrow();
  });

  it("rechaza contraseñas que superan 72 bytes", () => {
    expect(() =>
      loginSchema.parse({
        email: "victor@example.com",
        password: "á".repeat(37),
      }),
    ).toThrow();
  });
});
