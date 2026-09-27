import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authRepository } from "../../../src/modules/auth/repositories/auth.repository.js";
import {
  InvalidCredentialsError,
  loginService,
} from "../../../src/modules/auth/services/login.service.js";
import { passwordService } from "../../../src/modules/auth/services/password.service.js";

vi.mock("../../../src/modules/auth/repositories/auth.repository.js", () => ({
  authRepository: {
    findActiveByEmailWithPassword: vi.fn(),
  },
}));

vi.mock("../../../src/modules/auth/services/password.service.js", () => ({
  passwordService: {
    hash: vi.fn(),
    verify: vi.fn(),
  },
}));

describe("loginService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("verifica la contraseña y devuelve el usuario público", async () => {
    const userId = new Types.ObjectId();
    const createdAt = new Date("2026-09-26T12:00:00.000Z");

    vi.mocked(authRepository.findActiveByEmailWithPassword).mockResolvedValue({
      _id: userId,
      firstName: "Víctor",
      lastName: "Hugo Segundo Aguilar",
      email: "victor@example.com",
      passwordHash: "password-hash",
      role: "customer",
      active: true,
      emailVerified: false,
      createdAt,
      updatedAt: createdAt,
    } as never);

    vi.mocked(passwordService.verify).mockResolvedValue(true);

    const result = await loginService.login({
      email: "victor@example.com",
      password: "password-seguro",
    });

    expect(passwordService.verify).toHaveBeenCalledWith(
      "password-seguro",
      "password-hash",
    );

    expect(result).toEqual({
      id: userId.toString(),
      name: "Víctor Hugo Segundo Aguilar",
      email: "victor@example.com",
      role: "customer",
      createdAt: createdAt.toISOString(),
    });

    expect(result).not.toHaveProperty("passwordHash");
  });

  it("usa la respuesta genérica cuando el correo no existe", async () => {
    vi.mocked(authRepository.findActiveByEmailWithPassword).mockResolvedValue(
      null,
    );

    vi.mocked(passwordService.verify).mockResolvedValue(false);

    await expect(
      loginService.login({
        email: "inexistente@example.com",
        password: "password-seguro",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(passwordService.verify).toHaveBeenCalledOnce();
  });

  it("usa la misma respuesta cuando la contraseña es incorrecta", async () => {
    vi.mocked(authRepository.findActiveByEmailWithPassword).mockResolvedValue({
      passwordHash: "password-hash",
    } as never);

    vi.mocked(passwordService.verify).mockResolvedValue(false);

    await expect(
      loginService.login({
        email: "victor@example.com",
        password: "password-incorrecto",
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });
});
