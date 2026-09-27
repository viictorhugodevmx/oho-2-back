import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { authSessionService } from "../../src/modules/auth/services/auth-session.service.js";
import {
  EmailAlreadyRegisteredError,
  registerService,
} from "../../src/modules/auth/services/register.service.js";

vi.mock("../../src/modules/auth/services/register.service.js", () => {
  class MockEmailAlreadyRegisteredError extends Error {
    readonly code = "EMAIL_ALREADY_REGISTERED";

    constructor() {
      super("Ya existe una cuenta registrada con ese correo.");
      this.name = "EmailAlreadyRegisteredError";
    }
  }

  return {
    EmailAlreadyRegisteredError: MockEmailAlreadyRegisteredError,
    registerService: {
      register: vi.fn(),
    },
  };
});

vi.mock("../../src/modules/auth/services/auth-session.service.js", () => ({
  authSessionService: {
    create: vi.fn(),
  },
}));

describe("POST /api/v1/auth/register", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea la cuenta, inicia la sesión y establece la cookie", async () => {
    const user = {
      id: "507f1f77bcf86cd799439011",
      name: "Víctor Hugo Segundo Aguilar",
      email: "victor@example.com",
      role: "customer" as const,
      createdAt: "2026-09-26T12:00:00.000Z",
    };

    vi.mocked(registerService.register).mockResolvedValue(user);
    vi.mocked(authSessionService.create).mockResolvedValue({
      response: {
        user,
        accessToken: "access-token",
      },
      refreshToken: "refresh-token",
      refreshExpiresAt: new Date("2026-10-26T12:00:00.000Z"),
    });

    const response = await request(app)
      .post("/api/v1/auth/register")
      .set("user-agent", "vitest")
      .send({
        name: "  Víctor   Hugo Segundo Aguilar  ",
        email: "  VICTOR@EXAMPLE.COM ",
        password: "password-seguro",
      });

    expect(response.status).toBe(201);

    expect(registerService.register).toHaveBeenCalledWith({
      name: "Víctor Hugo Segundo Aguilar",
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

  it("rechaza datos inválidos", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      name: "Víctor",
      email: "correo-invalido",
      password: "corta",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(registerService.register).not.toHaveBeenCalled();
  });

  it("devuelve conflicto cuando el correo ya existe", async () => {
    vi.mocked(registerService.register).mockRejectedValue(
      new EmailAlreadyRegisteredError(),
    );

    const response = await request(app).post("/api/v1/auth/register").send({
      name: "Víctor Aguilar",
      email: "victor@example.com",
      password: "password-seguro",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: "EMAIL_ALREADY_REGISTERED",
        message: "Ya existe una cuenta registrada con ese correo.",
        details: [],
      },
    });
  });
});
