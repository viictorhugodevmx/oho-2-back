import { beforeEach, describe, expect, it, vi } from "vitest";

import { refreshSessionRepository } from "../../../src/modules/auth/repositories/refresh-session.repository.js";
import { logoutService } from "../../../src/modules/auth/services/logout.service.js";
import { tokenService } from "../../../src/modules/auth/services/token.service.js";

vi.mock(
  "../../../src/modules/auth/repositories/refresh-session.repository.js",
  () => ({
    refreshSessionRepository: {
      revokeByTokenHash: vi.fn(),
    },
  }),
);

vi.mock("../../../src/modules/auth/services/token.service.js", () => ({
  tokenService: {
    hashRefreshToken: vi.fn(),
  },
}));

describe("logoutService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revoca la sesión asociada al refresh token", async () => {
    vi.mocked(tokenService.hashRefreshToken).mockReturnValue(
      "refresh-token-hash",
    );

    vi.mocked(refreshSessionRepository.revokeByTokenHash).mockResolvedValue({
      modifiedCount: 1,
    } as never);

    await logoutService.logout("refresh-token");

    expect(tokenService.hashRefreshToken).toHaveBeenCalledWith("refresh-token");

    expect(refreshSessionRepository.revokeByTokenHash).toHaveBeenCalledWith(
      "refresh-token-hash",
      expect.any(Date),
    );
  });

  it("termina correctamente cuando no existe cookie", async () => {
    await expect(logoutService.logout(undefined)).resolves.toBeUndefined();

    expect(tokenService.hashRefreshToken).not.toHaveBeenCalled();
    expect(refreshSessionRepository.revokeByTokenHash).not.toHaveBeenCalled();
  });
});
