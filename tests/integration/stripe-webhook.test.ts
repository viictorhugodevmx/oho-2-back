import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import {
  StripeWebhookSignatureError,
  stripeWebhookService,
} from "../../src/modules/payments/services/stripe-webhook.service.js";

describe("Stripe webhook API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("entrega el cuerpo crudo y la firma al servicio", async () => {
    const processWebhook = vi
      .spyOn(stripeWebhookService, "process")
      .mockImplementation(async (rawBody, signature) => {
        expect(Buffer.isBuffer(rawBody)).toBe(true);

        expect(rawBody.toString("utf8")).toContain('"id":"evt_test_001"');

        expect(signature).toBe("test-signature");

        return {
          eventId: "evt_test_001",
          eventType: "checkout.session.completed",
          status: "processed",
        };
      });

    const response = await request(createApp())
      .post("/api/v1/payments/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "test-signature")
      .send(
        JSON.stringify({
          id: "evt_test_001",
        }),
      );

    expect(response.status).toBe(200);

    expect(response.body).toEqual({
      received: true,
      eventId: "evt_test_001",
      eventType: "checkout.session.completed",
      status: "processed",
    });

    expect(processWebhook).toHaveBeenCalledTimes(1);
  });

  it("requiere la firma de Stripe", async () => {
    const processWebhook = vi.spyOn(stripeWebhookService, "process");

    const response = await request(createApp())
      .post("/api/v1/payments/stripe/webhook")
      .set("Content-Type", "application/json")
      .send(
        JSON.stringify({
          id: "evt_test_002",
        }),
      );

    expect(response.status).toBe(400);

    expect(response.body.error.code).toBe("STRIPE_SIGNATURE_REQUIRED");

    expect(processWebhook).not.toHaveBeenCalled();
  });

  it("rechaza una firma inválida", async () => {
    vi.spyOn(stripeWebhookService, "process").mockRejectedValue(
      new StripeWebhookSignatureError(),
    );

    const response = await request(createApp())
      .post("/api/v1/payments/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "invalid-signature")
      .send(
        JSON.stringify({
          id: "evt_test_003",
        }),
      );

    expect(response.status).toBe(400);

    expect(response.body.error.code).toBe("INVALID_STRIPE_SIGNATURE");
  });

  it("devuelve un error para permitir el reintento de Stripe", async () => {
    vi.spyOn(stripeWebhookService, "process").mockRejectedValue(
      new Error("Temporary processing failure."),
    );

    const response = await request(createApp())
      .post("/api/v1/payments/stripe/webhook")
      .set("Content-Type", "application/json")
      .set("stripe-signature", "test-signature")
      .send(
        JSON.stringify({
          id: "evt_test_004",
        }),
      );

    expect(response.status).toBe(500);
  });
});
