import { describe, expect, it } from "vitest";
import { IdempotencyRecordModel } from "../../../src/modules/orders/models/idempotency-record.model.js";

describe("IdempotencyRecordModel", () => {
  it("crea un registro inicialmente en procesamiento", async () => {
    const record = new IdempotencyRecordModel({
      operation: "create_order",
      keyHash: "sha256-idempotency-key",
      requestHash: "sha256-request-body",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(record.validate()).resolves.toBeUndefined();

    expect(record.status).toBe("processing");
    expect(record.orderId).toBeNull();
    expect(record.responseStatusCode).toBeNull();
    expect(record.errorCode).toBeNull();
    expect(record.completedAt).toBeNull();
    expect(record.lockedAt).toBeInstanceOf(Date);
  });

  it("requiere operación, hashes y expiración", async () => {
    const record = new IdempotencyRecordModel();

    await expect(record.validate()).rejects.toMatchObject({
      errors: {
        operation: expect.anything(),
        keyHash: expect.anything(),
        requestHash: expect.anything(),
        expiresAt: expect.anything(),
      },
    });
  });

  it("protege los hashes en consultas normales", () => {
    expect(IdempotencyRecordModel.schema.paths.keyHash?.options).toMatchObject({
      select: false,
    });

    expect(
      IdempotencyRecordModel.schema.paths.requestHash?.options,
    ).toMatchObject({
      select: false,
    });
  });

  it("incluye índices compuesto único y TTL", () => {
    const indexes = IdempotencyRecordModel.schema.indexes();

    const operationKeyIndex = indexes.find(
      ([fields]) => fields.operation === 1 && fields.keyHash === 1,
    );

    const expiresAtIndex = indexes.find(([fields]) => fields.expiresAt === 1);

    expect(operationKeyIndex?.[1]).toMatchObject({
      unique: true,
    });

    expect(expiresAtIndex?.[1]).toMatchObject({
      expireAfterSeconds: 0,
    });
  });
});
