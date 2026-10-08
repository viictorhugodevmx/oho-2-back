import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import { PaymentAttemptModel } from "../../../src/modules/payments/models/payment-attempt.model.js";

function createValidAttempt() {
  return new PaymentAttemptModel({
    orderId: new Types.ObjectId(),
    provider: "stripe",
    checkoutSessionId: "cs_test_checkout_session_001",
    checkoutUrl:
      "https://checkout.stripe.com/c/pay/cs_test_checkout_session_001",
    currency: "MXN",
    amountTotalCents: 99_800,
    status: "open",
    expiresAt: new Date("2026-10-07T20:00:00.000Z"),
    paymentIntentId: null,
    completedAt: null,
    failedAt: null,
  });
}

describe("PaymentAttemptModel", () => {
  it("acepta un intento abierto de Stripe", async () => {
    const attempt = createValidAttempt();

    await expect(attempt.validate()).resolves.toBeUndefined();

    expect(attempt.provider).toBe("stripe");
    expect(attempt.status).toBe("open");
    expect(attempt.amountTotalCents).toBe(99_800);
  });

  it("requiere pedido, sesión, URL e importe", async () => {
    const attempt = new PaymentAttemptModel({});

    await expect(attempt.validate()).rejects.toThrow();
  });

  it("rechaza importes fraccionarios", async () => {
    const attempt = createValidAttempt();

    attempt.amountTotalCents = 99_800.5;

    await expect(attempt.validate()).rejects.toThrow();
  });

  it("declara única la sesión de Checkout", () => {
    const indexes = PaymentAttemptModel.schema.indexes();

    expect(
      indexes.some(
        ([fields, options]) =>
          fields.checkoutSessionId === 1 && options.unique === true,
      ),
    ).toBe(true);
  });

  it("permite buscar sesiones activas por pedido", () => {
    const indexes = PaymentAttemptModel.schema.indexes();

    expect(
      indexes.some(
        ([fields]) =>
          fields.orderId === 1 && fields.status === 1 && fields.expiresAt === 1,
      ),
    ).toBe(true);
  });
});
