import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import {
  AuthenticatedUserNotFoundError,
  currentUserService,
} from "../../src/modules/auth/services/current-user.service.js";
import { tokenService } from "../../src/modules/auth/services/token.service.js";

vi.mock("../../src/modules/auth/services/token.service.js", () => ({
  tokenService: {
    verifyAccessToken: vi.fn(),
  },
}));

vi.mock("../../src/modules/auth/services/current-user.service.js", () => {
  class MockAuthenticatedUserNotFoundError extends Error {
    readonly code = "UNAUTHORIZED";

    constructor() {
      super("La sesión ya no pertenece a una cuenta activa.");
      this.name = "AuthenticatedUserNotFoundError";
    }
  }

  return {
    AuthenticatedUserNotFoundError: MockAuthenticatedUserNotFoundError,
    currentUserService: {
      getById: vi.fn(),
    },
  };
});

describe("GET /api/v1/auth/me", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("devuelve el usuario del access token válido", async () => {
    const user = {
      id: "507f1f77bcf86cd799439011",
      name: "Víctor Hugo Segundo Aguilar",
      email: "victor@example.com",
      role: "customer" as const,
      createdAt: "2026-09-26T12:00:00.000Z",
    };

    vi.mocked(tokenService.verifyAccessToken).mockResolvedValue({
      userId: user.id,
      role: user.role,
    });

    vi.mocked(currentUserService.getById).mockResolvedValue(user);

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer valid-access-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      user,
    });

    expect(currentUserService.getById).toHaveBeenCalledWith(user.id);
  });

  it("rechaza la petición sin access token", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
    expect(currentUserService.getById).not.toHaveBeenCalled();
  });

  it("rechaza un token cuya cuenta ya no está activa", async () => {
    vi.mocked(tokenService.verifyAccessToken).mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      role: "customer",
    });

    vi.mocked(currentUserService.getById).mockRejectedValue(
      new AuthenticatedUserNotFoundError(),
    );

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer valid-access-token");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});
