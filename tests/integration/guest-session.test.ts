import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";

describe("Guest checkout session API", () => {
  it("crea una sesión invitada sin exponer el hash", async () => {
    const response = await request(createApp())
      .post("/api/v1/checkout/guest-session")
      .expect(201);

    expect(response.body).toEqual({
      guestSessionToken: expect.any(String),
      headerName: "x-oho-guest-session-token",
    });

    expect(response.body.guestSessionToken).toMatch(/^[A-Za-z0-9_-]+$/);

    expect(response.body).not.toHaveProperty("tokenHash");
  });

  it("genera un token diferente en cada solicitud", async () => {
    const firstResponse = await request(createApp())
      .post("/api/v1/checkout/guest-session")
      .expect(201);

    const secondResponse = await request(createApp())
      .post("/api/v1/checkout/guest-session")
      .expect(201);

    expect(firstResponse.body.guestSessionToken).not.toBe(
      secondResponse.body.guestSessionToken,
    );
  });
});
