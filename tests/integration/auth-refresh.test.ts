import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import {
  InvalidRefreshTokenError,
  refreshService,
} from "../../src/modules/auth/services/refresh.service.js";

vi.mock("../../src/modules/auth/services/refresh.service.js", () => {
  class MockInvalidRefreshTokenError extends Error {
    readonly code = "INVALID_REFRESH_TOKEN";

    constructor() {
      super("La sesión no es válida o ha expirado.");
      this.name = "InvalidRefreshTokenError";
    }
  }

  return {
    InvalidRefreshTokenError: MockInvalidRefreshTokenError,
    refreshService: {
      rotate: vi.fn(),
    },
  };
});

describe("POST /api/v1/auth/refresh", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rota la cookie y devuelve un nuevo access token", async () => {
    const user = {
      id: "507f1f77bcf86cd799439011",
      name: "Víctor Aguilar",
      email: "victor@example.com",
      role: "customer" as const,
      createdAt: "2026-09-26T12:00:00.000Z",
    };

    vi.mocked(refreshService.rotate).mockResolvedValue({
      response: {
        user,
        accessToken: "next-access-token",
      },
      refreshToken: "next-refresh-token",
      refreshExpiresAt: new Date("2026-10-26T12:00:00.000Z"),
    });

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `${env.AUTH_REFRESH_COOKIE_NAME}=current-refresh-token`);

    expect(response.status).toBe(200);

    expect(refreshService.rotate).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshToken: "current-refresh-token",
      }),
    );

    expect(response.body).toEqual({
      user,
      accessToken: "next-access-token",
    });

    const cookies = response.headers["set-cookie"] as unknown as string[];

    expect(cookies[0]).toContain(
      `${env.AUTH_REFRESH_COOKIE_NAME}=next-refresh-token`,
    );
    expect(cookies[0]).toContain("HttpOnly");
  });

  it("rechaza solicitudes sin cookie", async () => {
    const response = await request(app).post("/api/v1/auth/refresh");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("REFRESH_TOKEN_REQUIRED");
    expect(refreshService.rotate).not.toHaveBeenCalled();
  });

  it("elimina la cookie cuando el token es inválido", async () => {
    vi.mocked(refreshService.rotate).mockRejectedValue(
      new InvalidRefreshTokenError(),
    );

    const response = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", `${env.AUTH_REFRESH_COOKIE_NAME}=invalid-token`);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_REFRESH_TOKEN");

    const cookies = response.headers["set-cookie"] as unknown as string[];

    expect(cookies[0]).toContain(`${env.AUTH_REFRESH_COOKIE_NAME}=`);
    expect(cookies[0]).toContain("Expires=");
  });
});
