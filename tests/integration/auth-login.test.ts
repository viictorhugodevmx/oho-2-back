import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { authSessionService } from "../../src/modules/auth/services/auth-session.service.js";
import {
  InvalidCredentialsError,
  loginService,
} from "../../src/modules/auth/services/login.service.js";

vi.mock("../../src/modules/auth/services/login.service.js", () => {
  class MockInvalidCredentialsError extends Error {
    readonly code = "INVALID_CREDENTIALS";

    constructor() {
      super("El correo o la contraseña son incorrectos.");
      this.name = "InvalidCredentialsError";
    }
  }

  return {
    InvalidCredentialsError: MockInvalidCredentialsError,
    loginService: {
      login: vi.fn(),
    },
  };
});

vi.mock("../../src/modules/auth/services/auth-session.service.js", () => ({
  authSessionService: {
    create: vi.fn(),
  },
}));

describe("POST /api/v1/auth/login", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inicia sesión y establece la cookie renovable", async () => {
    const user = {
      id: "507f1f77bcf86cd799439011",
      name: "Víctor Hugo Segundo Aguilar",
      email: "victor@example.com",
      role: "customer" as const,
      createdAt: "2026-09-26T12:00:00.000Z",
    };

    vi.mocked(loginService.login).mockResolvedValue(user);
    vi.mocked(authSessionService.create).mockResolvedValue({
      response: {
        user,
        accessToken: "access-token",
      },
      refreshToken: "refresh-token",
      refreshExpiresAt: new Date("2026-10-26T12:00:00.000Z"),
    });

    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("user-agent", "vitest")
      .send({
        email: "  VICTOR@EXAMPLE.COM ",
        password: "password-seguro",
      });

    expect(response.status).toBe(200);

    expect(loginService.login).toHaveBeenCalledWith({
      email: "victor@example.com",
      password: "password-seguro",
    });

    expect(response.body).toEqual({
      user,
      accessToken: "access-token",
    });

    const cookies = response.headers["set-cookie"] as unknown as string[];

    expect(cookies[0]).toContain(
      `${env.AUTH_REFRESH_COOKIE_NAME}=refresh-token`,
    );
    expect(cookies[0]).toContain("HttpOnly");
    expect(cookies[0]).toContain("SameSite=Lax");
    expect(cookies[0]).toContain("Path=/api/v1/auth");
  });

  it("rechaza datos con formato inválido", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "correo-invalido",
      password: "",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(loginService.login).not.toHaveBeenCalled();
  });

  it("rechaza credenciales incorrectas sin revelar cuál falló", async () => {
    vi.mocked(loginService.login).mockRejectedValue(
      new InvalidCredentialsError(),
    );

    const response = await request(app).post("/api/v1/auth/login").send({
      email: "victor@example.com",
      password: "password-incorrecto",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: {
        code: "INVALID_CREDENTIALS",
        message: "El correo o la contraseña son incorrectos.",
        details: [],
      },
    });
  });
});
