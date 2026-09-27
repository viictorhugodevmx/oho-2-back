import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { authenticate } from "../../../src/modules/auth/middlewares/authenticate.js";
import { tokenService } from "../../../src/modules/auth/services/token.service.js";

vi.mock("../../../src/modules/auth/services/token.service.js", () => ({
  tokenService: {
    verifyAccessToken: vi.fn(),
  },
}));

describe("authenticate", () => {
  const app = express();

  app.get("/protected", authenticate, (request, response) => {
    response.status(200).json({
      auth: request.auth,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite una petición con access token válido", async () => {
    vi.mocked(tokenService.verifyAccessToken).mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      role: "customer",
    });

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer valid-access-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      auth: {
        userId: "507f1f77bcf86cd799439011",
        role: "customer",
      },
    });
  });

  it("rechaza una petición sin access token", async () => {
    const response = await request(app).get("/protected");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rechaza un access token inválido", async () => {
    vi.mocked(tokenService.verifyAccessToken).mockRejectedValue(
      new Error("Invalid token"),
    );

    const response = await request(app)
      .get("/protected")
      .set("Authorization", "Bearer invalid-access-token");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});
