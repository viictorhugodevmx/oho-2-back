import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { orderRepository } from "../../../src/modules/orders/repositories/order.repository.js";
import { paymentAttemptRepository } from "../../../src/modules/payments/repositories/payment-attempt.repository.js";
import { stripeWebhookEventRepository } from "../../../src/modules/payments/repositories/stripe-webhook-event.repository.js";
import { paymentFulfillmentService } from "../../../src/modules/payments/services/payment-fulfillment.service.js";
import {
  StripeWebhookSignatureError,
  stripeWebhookService,
} from "../../../src/modules/payments/services/stripe-webhook.service.js";
import { stripeWebhookProvider } from "../../../src/providers/payment/stripe-webhook.provider.js";

const CURRENT_DATE = new Date("2026-10-07T21:30:00.000Z");

const ORDER_ID = new Types.ObjectId();

const payload = Buffer.from('{"id":"evt_test_checkout_001"}');

const signature = "t=1791400000,v1=test-signature";

function createEvent(
  eventType = "checkout.session.completed",
  paymentStatus = "paid",
) {
  return {
    eventId: "evt_test_checkout_001",
    eventType,
    checkoutSession: {
      checkoutSessionId: "cs_test_checkout_001",
      paymentStatus,
      paymentIntentId: "pi_test_payment_001",
      clientReferenceId: ORDER_ID.toString(),
      orderId: ORDER_ID.toString(),
      orderNumber: "OHO-20261007-A1B2C3D4",
    },
  };
}

function mockClaim() {
  vi.spyOn(stripeWebhookEventRepository, "createProcessing").mockResolvedValue(
    {} as never,
  );

  return vi
    .spyOn(stripeWebhookEventRepository, "markCompleted")
    .mockResolvedValue({} as never);
}

function mockAttempt() {
  vi.spyOn(
    paymentAttemptRepository,
    "findByCheckoutSessionId",
  ).mockResolvedValue({
    orderId: ORDER_ID,
    currency: "MXN",
    amountTotalCents: 99_800,
  } as never);
}

describe("stripeWebhookService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("confirma un pago y coordina la impresión", async () => {
    vi.spyOn(stripeWebhookProvider, "verifyAndParse").mockReturnValue(
      createEvent(),
    );

    const markEventCompleted = mockClaim();

    mockAttempt();

    vi.spyOn(orderRepository, "findById").mockResolvedValue({
      _id: ORDER_ID,
      currency: "MXN",
      totalCents: 99_800,
    } as never);

    const markAttempt = vi
      .spyOn(paymentAttemptRepository, "markCompleted")
      .mockResolvedValue({} as never);

    const fulfill = vi
      .spyOn(paymentFulfillmentService, "completePaidOrder")
      .mockResolvedValue();

    const result = await stripeWebhookService.process(
      payload,
      signature,
      CURRENT_DATE,
    );

    expect(result.status).toBe("processed");

    expect(markAttempt).toHaveBeenCalledWith(
      "cs_test_checkout_001",
      "pi_test_payment_001",
      CURRENT_DATE,
    );

    expect(fulfill).toHaveBeenCalledWith(ORDER_ID, CURRENT_DATE);

    expect(markEventCompleted).toHaveBeenCalledWith(
      "evt_test_checkout_001",
      CURRENT_DATE,
    );
  });

  it("ignora una repetición ya completada", async () => {
    vi.spyOn(stripeWebhookProvider, "verifyAndParse").mockReturnValue(
      createEvent(),
    );

    vi.spyOn(
      stripeWebhookEventRepository,
      "createProcessing",
    ).mockRejectedValue({
      code: 11_000,
    });

    vi.spyOn(stripeWebhookEventRepository, "findByEventId").mockResolvedValue({
      status: "completed",
    } as never);

    const fulfill = vi.spyOn(paymentFulfillmentService, "completePaidOrder");

    const result = await stripeWebhookService.process(
      payload,
      signature,
      CURRENT_DATE,
    );

    expect(result.status).toBe("duplicate");

    expect(fulfill).not.toHaveBeenCalled();
  });

  it("reintenta un evento previamente fallido", async () => {
    vi.spyOn(stripeWebhookProvider, "verifyAndParse").mockReturnValue(
      createEvent("customer.created", "unpaid"),
    );

    vi.spyOn(
      stripeWebhookEventRepository,
      "createProcessing",
    ).mockRejectedValue({
      code: 11_000,
    });

    vi.spyOn(stripeWebhookEventRepository, "findByEventId").mockResolvedValue({
      status: "failed",
    } as never);

    const retry = vi
      .spyOn(stripeWebhookEventRepository, "retryFailed")
      .mockResolvedValue({} as never);

    const markCompleted = vi
      .spyOn(stripeWebhookEventRepository, "markCompleted")
      .mockResolvedValue({} as never);

    const result = await stripeWebhookService.process(
      payload,
      signature,
      CURRENT_DATE,
    );

    expect(retry).toHaveBeenCalled();
    expect(result.status).toBe("ignored");
    expect(markCompleted).toHaveBeenCalled();
  });

  it("registra un pago asíncrono fallido", async () => {
    vi.spyOn(stripeWebhookProvider, "verifyAndParse").mockReturnValue(
      createEvent("checkout.session.async_payment_failed", "unpaid"),
    );

    mockClaim();
    mockAttempt();

    const markAttempt = vi
      .spyOn(paymentAttemptRepository, "markFailed")
      .mockResolvedValue({} as never);

    const markOrder = vi
      .spyOn(orderRepository, "markPaymentFailed")
      .mockResolvedValue({} as never);

    await stripeWebhookService.process(payload, signature, CURRENT_DATE);

    expect(markAttempt).toHaveBeenCalledWith(
      "cs_test_checkout_001",
      CURRENT_DATE,
    );

    expect(markOrder).toHaveBeenCalledWith(ORDER_ID);
  });

  it("marca una sesión expirada", async () => {
    vi.spyOn(stripeWebhookProvider, "verifyAndParse").mockReturnValue(
      createEvent("checkout.session.expired", "unpaid"),
    );

    mockClaim();

    const markExpired = vi
      .spyOn(paymentAttemptRepository, "markExpired")
      .mockResolvedValue({} as never);

    await stripeWebhookService.process(payload, signature, CURRENT_DATE);

    expect(markExpired).toHaveBeenCalledWith("cs_test_checkout_001");
  });

  it("marca como ignorado un evento no relacionado", async () => {
    vi.spyOn(stripeWebhookProvider, "verifyAndParse").mockReturnValue({
      eventId: "evt_test_customer_001",
      eventType: "customer.created",
      checkoutSession: null,
    });

    mockClaim();

    const result = await stripeWebhookService.process(
      payload,
      signature,
      CURRENT_DATE,
    );

    expect(result.status).toBe("ignored");
  });

  it("rechaza una firma inválida sin persistir el evento", async () => {
    vi.spyOn(stripeWebhookProvider, "verifyAndParse").mockImplementation(() => {
      throw new Error("Invalid signature.");
    });

    const createEventRecord = vi.spyOn(
      stripeWebhookEventRepository,
      "createProcessing",
    );

    await expect(
      stripeWebhookService.process(payload, signature, CURRENT_DATE),
    ).rejects.toBeInstanceOf(StripeWebhookSignatureError);

    expect(createEventRecord).not.toHaveBeenCalled();
  });

  it("guarda el fallo para que Stripe pueda reintentarlo", async () => {
    vi.spyOn(stripeWebhookProvider, "verifyAndParse").mockReturnValue(
      createEvent(),
    );

    mockClaim();
    mockAttempt();

    vi.spyOn(orderRepository, "findById").mockResolvedValue({
      _id: ORDER_ID,
      currency: "MXN",
      totalCents: 99_800,
    } as never);

    vi.spyOn(paymentAttemptRepository, "markCompleted").mockResolvedValue(
      {} as never,
    );

    vi.spyOn(paymentFulfillmentService, "completePaidOrder").mockRejectedValue(
      new Error("Print provider unavailable."),
    );

    const markFailed = vi
      .spyOn(stripeWebhookEventRepository, "markFailed")
      .mockResolvedValue({} as never);

    await expect(
      stripeWebhookService.process(payload, signature, CURRENT_DATE),
    ).rejects.toThrow("Print provider unavailable.");

    expect(markFailed).toHaveBeenCalledWith(
      "evt_test_checkout_001",
      "Print provider unavailable.",
    );
  });
});
