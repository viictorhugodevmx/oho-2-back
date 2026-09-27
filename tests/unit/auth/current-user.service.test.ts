import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authRepository } from "../../../src/modules/auth/repositories/auth.repository.js";
import {
  AuthenticatedUserNotFoundError,
  currentUserService,
} from "../../../src/modules/auth/services/current-user.service.js";

vi.mock("../../../src/modules/auth/repositories/auth.repository.js", () => ({
  authRepository: {
    findActiveById: vi.fn(),
  },
}));

describe("currentUserService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve los datos públicos de la cuenta activa", async () => {
    const userId = new Types.ObjectId();
    const createdAt = new Date("2026-09-26T12:00:00.000Z");

    vi.mocked(authRepository.findActiveById).mockResolvedValue({
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

    const result = await currentUserService.getById(userId.toString());

    expect(result).toEqual({
      id: userId.toString(),
      name: "Víctor Hugo Segundo Aguilar",
      email: "victor@example.com",
      role: "customer",
      createdAt: createdAt.toISOString(),
    });

    expect(result).not.toHaveProperty("passwordHash");
  });

  it("rechaza una sesión cuya cuenta ya no está activa", async () => {
    vi.mocked(authRepository.findActiveById).mockResolvedValue(null);

    await expect(
      currentUserService.getById("507f1f77bcf86cd799439011"),
    ).rejects.toBeInstanceOf(AuthenticatedUserNotFoundError);
  });
});
