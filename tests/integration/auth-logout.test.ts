import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { logoutService } from "../../src/modules/auth/services/logout.service.js";

vi.mock("../../src/modules/auth/services/logout.service.js", () => ({
  logoutService: {
    logout: vi.fn(),
  },
}));

describe("POST /api/v1/auth/logout", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revoca la sesión y elimina la cookie", async () => {
    vi.mocked(logoutService.logout).mockResolvedValue();

    const response = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", `${env.AUTH_REFRESH_COOKIE_NAME}=refresh-token`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(logoutService.logout).toHaveBeenCalledWith("refresh-token");

    const cookies = response.headers["set-cookie"] as unknown as string[];

    expect(cookies[0]).toContain(`${env.AUTH_REFRESH_COOKIE_NAME}=`);
    expect(cookies[0]).toContain("Expires=");
    expect(cookies[0]).toContain("HttpOnly");
  });

  it("también finaliza si la cookie ya no existe", async () => {
    vi.mocked(logoutService.logout).mockResolvedValue();

    const response = await request(app).post("/api/v1/auth/logout");

    expect(response.status).toBe(204);
    expect(logoutService.logout).toHaveBeenCalledWith(undefined);
  });
});
