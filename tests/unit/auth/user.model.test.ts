import { describe, expect, it } from "vitest";
import { UserModel } from "../../../src/modules/auth/models/user.model.js";

describe("UserModel", () => {
  it("crea un cliente activo con correo normalizado", () => {
    const user = new UserModel({
      firstName: "  Víctor  ",
      lastName: "  Segundo Aguilar  ",
      email: "  VICTOR@EXAMPLE.COM  ",
      passwordHash: "$2b$12$hash-de-prueba",
    });

    expect(user.firstName).toBe("Víctor");
    expect(user.lastName).toBe("Segundo Aguilar");
    expect(user.email).toBe("victor@example.com");
    expect(user.role).toBe("customer");
    expect(user.active).toBe(true);
    expect(user.emailVerified).toBe(false);
  });

  it("acepta únicamente los roles definidos", async () => {
    const user = new UserModel({
      firstName: "Víctor",
      lastName: "Segundo",
      email: "victor@example.com",
      passwordHash: "$2b$12$hash-de-prueba",
      role: "owner",
    });

    await expect(user.validate()).rejects.toMatchObject({
      errors: {
        role: expect.anything(),
      },
    });
  });

  it("rechaza un correo inválido", async () => {
    const user = new UserModel({
      firstName: "Víctor",
      lastName: "Segundo",
      email: "correo-invalido",
      passwordHash: "$2b$12$hash-de-prueba",
    });

    await expect(user.validate()).rejects.toMatchObject({
      errors: {
        email: expect.anything(),
      },
    });
  });

  it("requiere el hash de la contraseña", async () => {
    const user = new UserModel({
      firstName: "Víctor",
      lastName: "Segundo",
      email: "victor@example.com",
    });

    await expect(user.validate()).rejects.toMatchObject({
      errors: {
        passwordHash: expect.anything(),
      },
    });
  });
});
