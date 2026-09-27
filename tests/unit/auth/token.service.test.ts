import { describe, expect, it } from "vitest";

import { env } from "../../../src/config/env.js";
import { tokenService } from "../../../src/modules/auth/services/token.service.js";

describe("tokenService", () => {
  it("genera y verifica un access token", async () => {
    const accessToken = await tokenService.issueAccessToken({
      userId: "user-123",
      role: "customer",
    });

    const payload = await tokenService.verifyAccessToken(accessToken);

    expect(payload).toEqual({
      userId: "user-123",
      role: "customer",
    });
  });

  it("genera un refresh token y calcula un hash estable", () => {
    const refreshToken = tokenService.createRefreshToken();
    const firstHash = tokenService.hashRefreshToken(refreshToken);
    const secondHash = tokenService.hashRefreshToken(refreshToken);

    expect(refreshToken).not.toBe(firstHash);
    expect(firstHash).toBe(secondHash);
    expect(firstHash).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("calcula la expiración configurada del refresh token", () => {
    const before = Date.now();
    const expiresAt = tokenService.getRefreshExpirationDate().getTime();
    const after = Date.now();

    const expectedDuration =
      env.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000;

    expect(expiresAt).toBeGreaterThanOrEqual(before + expectedDuration);

    expect(expiresAt).toBeLessThanOrEqual(after + expectedDuration);
  });
});
