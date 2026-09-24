import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { RefreshSessionModel } from "../../../src/modules/auth/models/refresh-session.model.js";

describe("RefreshSessionModel", () => {
  it("crea una sesión activa con valores opcionales iniciales", async () => {
    const session = new RefreshSessionModel({
      userId: new Types.ObjectId(),
      tokenHash: "sha256-token-hash",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(session.validate()).resolves.toBeUndefined();

    expect(session.revokedAt).toBeNull();
    expect(session.replacedBySessionId).toBeNull();
    expect(session.userAgent).toBeNull();
    expect(session.ipAddress).toBeNull();
  });

  it("requiere usuario, hash y fecha de expiración", async () => {
    const session = new RefreshSessionModel();

    await expect(session.validate()).rejects.toMatchObject({
      errors: {
        userId: expect.anything(),
        tokenHash: expect.anything(),
        expiresAt: expect.anything(),
      },
    });
  });

  it("excluye el hash del token de las consultas normales", () => {
    const tokenHashPath = RefreshSessionModel.schema.paths.tokenHash;

    expect(tokenHashPath?.options).toMatchObject({
      select: false,
    });
  });

  it("incluye un índice TTL para eliminar sesiones expiradas", () => {
    const expiresAtIndex = RefreshSessionModel.schema
      .indexes()
      .find(([fields]) => fields.expiresAt === 1);

    expect(expiresAtIndex?.[1]).toMatchObject({
      expireAfterSeconds: 0,
    });
  });
});
