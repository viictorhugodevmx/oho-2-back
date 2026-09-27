import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authRepository } from "../../../src/modules/auth/repositories/auth.repository.js";
import {
  EmailAlreadyRegisteredError,
  registerService,
} from "../../../src/modules/auth/services/register.service.js";
import { passwordService } from "../../../src/modules/auth/services/password.service.js";

vi.mock("../../../src/modules/auth/repositories/auth.repository.js", () => ({
  authRepository: {
    findByEmail: vi.fn(),
    createCustomer: vi.fn(),
  },
}));

vi.mock("../../../src/modules/auth/services/password.service.js", () => ({
  passwordService: {
    hash: vi.fn(),
    verify: vi.fn(),
  },
}));

describe("registerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea un cliente y devuelve solamente sus datos públicos", async () => {
    const createdAt = new Date("2026-09-26T12:00:00.000Z");
    const userId = new Types.ObjectId();

    vi.mocked(authRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(passwordService.hash).mockResolvedValue("password-hash");
    vi.mocked(authRepository.createCustomer).mockResolvedValue({
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

    const result = await registerService.register({
      name: "Víctor Hugo Segundo Aguilar",
      email: "victor@example.com",
      password: "password-seguro",
    });

    expect(passwordService.hash).toHaveBeenCalledWith("password-seguro");

    expect(authRepository.createCustomer).toHaveBeenCalledWith({
      firstName: "Víctor",
      lastName: "Hugo Segundo Aguilar",
      email: "victor@example.com",
      passwordHash: "password-hash",
    });

    expect(result).toEqual({
      id: userId.toString(),
      name: "Víctor Hugo Segundo Aguilar",
      email: "victor@example.com",
      role: "customer",
      createdAt: createdAt.toISOString(),
    });

    expect(result).not.toHaveProperty("passwordHash");
  });

  it("rechaza un correo que ya está registrado", async () => {
    vi.mocked(authRepository.findByEmail).mockResolvedValue({
      email: "victor@example.com",
    } as never);

    await expect(
      registerService.register({
        name: "Víctor Aguilar",
        email: "victor@example.com",
        password: "password-seguro",
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);

    expect(passwordService.hash).not.toHaveBeenCalled();
    expect(authRepository.createCustomer).not.toHaveBeenCalled();
  });

  it("controla una duplicación concurrente de MongoDB", async () => {
    vi.mocked(authRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(passwordService.hash).mockResolvedValue("password-hash");
    vi.mocked(authRepository.createCustomer).mockRejectedValue(
      Object.assign(new Error("Duplicate key"), {
        code: 11000,
      }),
    );

    await expect(
      registerService.register({
        name: "Víctor Aguilar",
        email: "victor@example.com",
        password: "password-seguro",
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });
});
