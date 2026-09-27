import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authRepository } from "../../../src/modules/auth/repositories/auth.repository.js";
import { refreshSessionRepository } from "../../../src/modules/auth/repositories/refresh-session.repository.js";
import {
  InvalidRefreshTokenError,
  refreshService,
} from "../../../src/modules/auth/services/refresh.service.js";
import { tokenService } from "../../../src/modules/auth/services/token.service.js";

vi.mock("../../../src/modules/auth/repositories/auth.repository.js", () => ({
  authRepository: {
    findActiveById: vi.fn(),
  },
}));

vi.mock(
  "../../../src/modules/auth/repositories/refresh-session.repository.js",
  () => ({
    refreshSessionRepository: {
      findActiveByTokenHash: vi.fn(),
      create: vi.fn(),
      revokeAndReplace: vi.fn(),
      deleteById: vi.fn(),
    },
  }),
);

vi.mock("../../../src/modules/auth/services/token.service.js", () => ({
  tokenService: {
    hashRefreshToken: vi.fn(),
    issueAccessToken: vi.fn(),
    createRefreshToken: vi.fn(),
    getRefreshExpirationDate: vi.fn(),
  },
}));

describe("refreshService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rota la sesión y devuelve nuevos tokens", async () => {
    const userId = new Types.ObjectId();
    const currentSessionId = new Types.ObjectId();
    const replacementSessionId = new Types.ObjectId();
    const createdAt = new Date("2026-09-26T12:00:00.000Z");
    const refreshExpiresAt = new Date("2026-10-26T12:00:00.000Z");

    vi.mocked(tokenService.hashRefreshToken)
      .mockReturnValueOnce("current-token-hash")
      .mockReturnValueOnce("next-token-hash");

    vi.mocked(refreshSessionRepository.findActiveByTokenHash).mockResolvedValue(
      {
        _id: currentSessionId,
        userId,
      } as never,
    );

    vi.mocked(authRepository.findActiveById).mockResolvedValue({
      _id: userId,
      firstName: "Víctor",
      lastName: "Aguilar",
      email: "victor@example.com",
      passwordHash: "password-hash",
      role: "customer",
      active: true,
      emailVerified: false,
      createdAt,
      updatedAt: createdAt,
    } as never);

    vi.mocked(tokenService.issueAccessToken).mockResolvedValue(
      "next-access-token",
    );
    vi.mocked(tokenService.createRefreshToken).mockReturnValue(
      "next-refresh-token",
    );
    vi.mocked(tokenService.getRefreshExpirationDate).mockReturnValue(
      refreshExpiresAt,
    );

    vi.mocked(refreshSessionRepository.create).mockResolvedValue({
      _id: replacementSessionId,
    } as never);

    vi.mocked(refreshSessionRepository.revokeAndReplace).mockResolvedValue({
      modifiedCount: 1,
    } as never);

    const result = await refreshService.rotate({
      refreshToken: "current-refresh-token",
      userAgent: " navegador ",
      ipAddress: " 127.0.0.1 ",
    });

    expect(refreshSessionRepository.revokeAndReplace).toHaveBeenCalledWith(
      currentSessionId,
      replacementSessionId,
      expect.any(Date),
    );

    expect(result).toEqual({
      response: {
        user: {
          id: userId.toString(),
          name: "Víctor Aguilar",
          email: "victor@example.com",
          role: "customer",
          createdAt: createdAt.toISOString(),
        },
        accessToken: "next-access-token",
      },
      refreshToken: "next-refresh-token",
      refreshExpiresAt,
    });
  });

  it("rechaza un token inexistente o expirado", async () => {
    vi.mocked(tokenService.hashRefreshToken).mockReturnValue(
      "invalid-token-hash",
    );

    vi.mocked(refreshSessionRepository.findActiveByTokenHash).mockResolvedValue(
      null,
    );

    await expect(
      refreshService.rotate({
        refreshToken: "invalid-refresh-token",
      }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);

    expect(authRepository.findActiveById).not.toHaveBeenCalled();
    expect(refreshSessionRepository.create).not.toHaveBeenCalled();
  });

  it("elimina el reemplazo si la sesión ya fue rotada", async () => {
    const userId = new Types.ObjectId();
    const currentSessionId = new Types.ObjectId();
    const replacementSessionId = new Types.ObjectId();
    const createdAt = new Date();

    vi.mocked(tokenService.hashRefreshToken)
      .mockReturnValueOnce("current-token-hash")
      .mockReturnValueOnce("next-token-hash");

    vi.mocked(refreshSessionRepository.findActiveByTokenHash).mockResolvedValue(
      {
        _id: currentSessionId,
        userId,
      } as never,
    );

    vi.mocked(authRepository.findActiveById).mockResolvedValue({
      _id: userId,
      firstName: "Víctor",
      lastName: "Aguilar",
      email: "victor@example.com",
      passwordHash: "password-hash",
      role: "customer",
      active: true,
      emailVerified: false,
      createdAt,
      updatedAt: createdAt,
    } as never);

    vi.mocked(tokenService.issueAccessToken).mockResolvedValue(
      "next-access-token",
    );
    vi.mocked(tokenService.createRefreshToken).mockReturnValue(
      "next-refresh-token",
    );
    vi.mocked(tokenService.getRefreshExpirationDate).mockReturnValue(
      new Date(),
    );

    vi.mocked(refreshSessionRepository.create).mockResolvedValue({
      _id: replacementSessionId,
    } as never);

    vi.mocked(refreshSessionRepository.revokeAndReplace).mockResolvedValue({
      modifiedCount: 0,
    } as never);

    vi.mocked(refreshSessionRepository.deleteById).mockResolvedValue({
      deletedCount: 1,
    } as never);

    await expect(
      refreshService.rotate({
        refreshToken: "current-refresh-token",
      }),
    ).rejects.toBeInstanceOf(InvalidRefreshTokenError);

    expect(refreshSessionRepository.deleteById).toHaveBeenCalledWith(
      replacementSessionId,
    );
  });
});
