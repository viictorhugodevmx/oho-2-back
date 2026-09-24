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

  it("acepta únicamente los roles definidos", () => {
    const user = new UserModel({
      firstName: "Víctor",
      lastName: "Segundo",
      email: "victor@example.com",
      passwordHash: "$2b$12$hash-de-prueba",
      role: "owner",
    });

    const validationError = user.validateSync();

    expect(validationError?.errors.role).toBeDefined();
  });

  it("rechaza un correo inválido", () => {
    const user = new UserModel({
      firstName: "Víctor",
      lastName: "Segundo",
      email: "correo-invalido",
      passwordHash: "$2b$12$hash-de-prueba",
    });

    const validationError = user.validateSync();

    expect(validationError?.errors.email).toBeDefined();
  });

  it("requiere el hash de la contraseña", () => {
    const user = new UserModel({
      firstName: "Víctor",
      lastName: "Segundo",
      email: "victor@example.com",
    });

    const validationError = user.validateSync();

    expect(validationError?.errors.passwordHash).toBeDefined();
  });
});
