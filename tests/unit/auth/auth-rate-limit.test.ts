import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { loginRateLimiter } from "../../../src/modules/auth/middlewares/auth-rate-limit.js";

describe("loginRateLimiter", () => {
  it("bloquea los intentos fallidos que superan el límite", async () => {
    const app = express();

    app.post("/login", loginRateLimiter, (_request, response) => {
      response.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
        },
      });
    });

    for (let attempt = 1; attempt <= 10; attempt += 1) {
      const response = await request(app).post("/login");

      expect(response.status).toBe(401);
    }

    const blockedResponse = await request(app).post("/login");

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body).toEqual({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Demasiados intentos de inicio de sesión. Intenta más tarde.",
        details: [],
      },
    });
  });
});
