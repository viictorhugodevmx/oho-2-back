import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { refreshSessionRepository } from "../../../src/modules/auth/repositories/refresh-session.repository.js";
import { authSessionService } from "../../../src/modules/auth/services/auth-session.service.js";
import { tokenService } from "../../../src/modules/auth/services/token.service.js";

vi.mock(
  "../../../src/modules/auth/repositories/refresh-session.repository.js",
  () => ({
    refreshSessionRepository: {
      create: vi.fn(),
    },
  }),
);

vi.mock("../../../src/modules/auth/services/token.service.js", () => ({
  tokenService: {
    issueAccessToken: vi.fn(),
    createRefreshToken: vi.fn(),
    hashRefreshToken: vi.fn(),
    getRefreshExpirationDate: vi.fn(),
  },
}));

describe("authSessionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea los tokens y persiste solamente el hash renovable", async () => {
    const userId = new Types.ObjectId().toString();
    const refreshExpiresAt = new Date("2026-10-26T12:00:00.000Z");

    const user = {
      id: userId,
      name: "Víctor Hugo Segundo Aguilar",
      email: "victor@example.com",
      role: "customer" as const,
      createdAt: "2026-09-26T12:00:00.000Z",
    };

    vi.mocked(tokenService.issueAccessToken).mockResolvedValue("access-token");
    vi.mocked(tokenService.createRefreshToken).mockReturnValue("refresh-token");
    vi.mocked(tokenService.hashRefreshToken).mockReturnValue(
      "refresh-token-hash",
    );
    vi.mocked(tokenService.getRefreshExpirationDate).mockReturnValue(
      refreshExpiresAt,
    );

    const result = await authSessionService.create({
      user,
      userAgent: "  navegador de prueba  ",
      ipAddress: " 127.0.0.1 ",
    });

    expect(refreshSessionRepository.create).toHaveBeenCalledWith({
      userId,
      tokenHash: "refresh-token-hash",
      expiresAt: refreshExpiresAt,
      userAgent: "navegador de prueba",
      ipAddress: "127.0.0.1",
    });

    expect(refreshSessionRepository.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: "refresh-token",
      }),
    );

    expect(result).toEqual({
      response: {
        user,
        accessToken: "access-token",
      },
      refreshToken: "refresh-token",
      refreshExpiresAt,
    });
  });
});
