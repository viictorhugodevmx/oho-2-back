import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { GuestOrderAccessModel } from "../../../src/modules/orders/models/guest-order-access.model.js";

describe("GuestOrderAccessModel", () => {
  it("crea un acceso invitado activo", async () => {
    const access = new GuestOrderAccessModel({
      orderId: new Types.ObjectId(),
      tokenHash: "sha256-guest-token-hash",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(access.validate()).resolves.toBeUndefined();

    expect(access.revokedAt).toBeNull();
    expect(access.accessCount).toBe(0);
    expect(access.lastAccessedAt).toBeNull();
  });

  it("requiere pedido, hash y fecha de expiración", async () => {
    const access = new GuestOrderAccessModel();

    await expect(access.validate()).rejects.toMatchObject({
      errors: {
        orderId: expect.anything(),
        tokenHash: expect.anything(),
        expiresAt: expect.anything(),
      },
    });
  });

  it("excluye el hash del token de las consultas normales", () => {
    const tokenHashPath = GuestOrderAccessModel.schema.paths.tokenHash;

    expect(tokenHashPath?.options).toMatchObject({
      select: false,
    });
  });

  it("incluye un índice TTL para accesos expirados", () => {
    const expiresAtIndex = GuestOrderAccessModel.schema
      .indexes()
      .find(([fields]) => fields.expiresAt === 1);

    expect(expiresAtIndex?.[1]).toMatchObject({
      expireAfterSeconds: 0,
    });
  });
});
