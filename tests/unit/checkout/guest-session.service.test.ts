import { describe, expect, it } from "vitest";

import {
  GUEST_SESSION_HEADER,
  guestSessionService,
} from "../../../src/modules/checkout/services/guest-session.service.js";

describe("guestSessionService", () => {
  it("genera un token invitado aleatorio", () => {
    const firstToken = guestSessionService.createToken();
    const secondToken = guestSessionService.createToken();

    expect(firstToken).not.toBe(secondToken);
    expect(firstToken).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(firstToken.length).toBeGreaterThanOrEqual(40);
  });

  it("genera un hash SHA-256 determinista", () => {
    const firstHash = guestSessionService.hashToken("guest-token");

    const secondHash = guestSessionService.hashToken("guest-token");

    expect(firstHash).toBe(secondHash);
    expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
    expect(firstHash).not.toContain("guest-token");
  });

  it("devuelve el token público y su hash privado", () => {
    const session = guestSessionService.create();

    expect(session.token).toEqual(expect.any(String));
    expect(session.tokenHash).toBe(
      guestSessionService.hashToken(session.token),
    );
  });

  it("define el encabezado utilizado por el checkout", () => {
    expect(GUEST_SESSION_HEADER).toBe("x-oho-guest-session-token");
  });
});
