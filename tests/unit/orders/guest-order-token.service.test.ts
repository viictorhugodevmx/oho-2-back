import { describe, expect, it } from "vitest";

import { guestOrderTokenService } from "../../../src/modules/orders/services/guest-order-token.service.js";

describe("guestOrderTokenService", () => {
  it("genera siempre el mismo token para el mismo pedido", () => {
    const orderId = "507f1f77bcf86cd799439011";

    const firstToken = guestOrderTokenService.createToken(orderId);
    const secondToken = guestOrderTokenService.createToken(orderId);

    expect(firstToken).toBe(secondToken);
    expect(firstToken).toHaveLength(43);
    expect(guestOrderTokenService.isValidToken(firstToken)).toBe(true);
  });

  it("genera tokens diferentes para pedidos diferentes", () => {
    const firstToken = guestOrderTokenService.createToken(
      "507f1f77bcf86cd799439011",
    );

    const secondToken = guestOrderTokenService.createToken(
      "507f1f77bcf86cd799439012",
    );

    expect(firstToken).not.toBe(secondToken);
  });

  it("genera un hash SHA-256 sin conservar el token original", () => {
    const token = guestOrderTokenService.createToken(
      "507f1f77bcf86cd799439011",
    );

    const tokenHash = guestOrderTokenService.hashToken(token);

    expect(tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(tokenHash).not.toBe(token);
  });

  it("calcula la expiración desde la fecha indicada", () => {
    const currentDate = new Date("2026-10-07T18:00:00.000Z");

    const expiresAt = guestOrderTokenService.getExpirationDate(currentDate);

    expect(expiresAt.getTime()).toBeGreaterThan(currentDate.getTime());
    expect(expiresAt.toISOString()).toBe("2026-11-06T18:00:00.000Z");
  });
});
