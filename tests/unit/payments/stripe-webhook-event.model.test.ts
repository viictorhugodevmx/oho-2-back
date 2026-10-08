import { describe, expect, it } from "vitest";

import { StripeWebhookEventModel } from "../../../src/modules/payments/models/stripe-webhook-event.model.js";

function createValidEvent() {
  return new StripeWebhookEventModel({
    eventId: "evt_test_webhook_001",
    eventType: "checkout.session.completed",
    status: "processing",
    attempts: 1,
    processedAt: null,
    lastError: null,
    expiresAt: new Date("2026-11-06T20:00:00.000Z"),
  });
}

describe("StripeWebhookEventModel", () => {
  it("acepta un evento pendiente de procesamiento", async () => {
    const event = createValidEvent();

    await expect(event.validate()).resolves.toBeUndefined();

    expect(event.status).toBe("processing");
    expect(event.attempts).toBe(1);
  });

  it("requiere identificador, tipo y expiración", async () => {
    const event = new StripeWebhookEventModel({});

    await expect(event.validate()).rejects.toThrow();
  });

  it("declara único el identificador de Stripe", () => {
    const indexes = StripeWebhookEventModel.schema.indexes();

    expect(
      indexes.some(
        ([fields, options]) => fields.eventId === 1 && options.unique === true,
      ),
    ).toBe(true);
  });

  it("declara un índice TTL para eventos antiguos", () => {
    const indexes = StripeWebhookEventModel.schema.indexes();

    expect(
      indexes.some(
        ([fields, options]) =>
          fields.expiresAt === 1 && options.expireAfterSeconds === 0,
      ),
    ).toBe(true);
  });
});
