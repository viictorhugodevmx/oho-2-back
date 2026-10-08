import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { StripeWebhookProvider } from "../../../src/providers/payment/stripe-webhook.provider.js";

const payload = Buffer.from('{"id":"evt_test_001"}');

const signature = "t=1791400000,v1=test-signature";

function createStripeMock(event: Stripe.Event) {
  const constructEvent = vi.fn().mockReturnValue(event);

  const stripe = {
    webhooks: {
      constructEvent,
    },
  } as unknown as Pick<Stripe, "webhooks">;

  return {
    stripe,
    constructEvent,
  };
}

function createCheckoutEvent(): Stripe.Event {
  return {
    id: "evt_test_checkout_001",
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_checkout_001",
        object: "checkout.session",
        payment_status: "paid",
        payment_intent: "pi_test_payment_001",
        client_reference_id: "507f1f77bcf86cd799439011",
        metadata: {
          orderId: "507f1f77bcf86cd799439011",
          orderNumber: "OHO-20261007-A1B2C3D4",
        },
      } as unknown as Stripe.Checkout.Session,
    },
  } as Stripe.Event;
}

describe("StripeWebhookProvider", () => {
  it("verifica la firma utilizando el cuerpo crudo", () => {
    const { stripe, constructEvent } = createStripeMock(createCheckoutEvent());

    const provider = new StripeWebhookProvider(stripe, "whsec_test_secret");

    provider.verifyAndParse(payload, signature);

    expect(constructEvent).toHaveBeenCalledWith(
      payload,
      signature,
      "whsec_test_secret",
    );
  });

  it("normaliza una sesión de Checkout pagada", () => {
    const { stripe } = createStripeMock(createCheckoutEvent());

    const provider = new StripeWebhookProvider(stripe, "whsec_test_secret");

    expect(provider.verifyAndParse(payload, signature)).toEqual({
      eventId: "evt_test_checkout_001",
      eventType: "checkout.session.completed",
      checkoutSession: {
        checkoutSessionId: "cs_test_checkout_001",
        paymentStatus: "paid",
        paymentIntentId: "pi_test_payment_001",
        clientReferenceId: "507f1f77bcf86cd799439011",
        orderId: "507f1f77bcf86cd799439011",
        orderNumber: "OHO-20261007-A1B2C3D4",
      },
    });
  });

  it("acepta PaymentIntent expandido", () => {
    const event = createCheckoutEvent();

    const session = event.data.object as Stripe.Checkout.Session;

    session.payment_intent = {
      id: "pi_test_expanded_001",
      object: "payment_intent",
    } as Stripe.PaymentIntent;

    const { stripe } = createStripeMock(event);

    const provider = new StripeWebhookProvider(stripe, "whsec_test_secret");

    const result = provider.verifyAndParse(payload, signature);

    expect(result.checkoutSession?.paymentIntentId).toBe(
      "pi_test_expanded_001",
    );
  });

  it("conserva eventos ajenos a Checkout sin interpretarlos", () => {
    const event = {
      id: "evt_test_customer_001",
      object: "event",
      type: "customer.created",
      data: {
        object: {
          id: "cus_test_001",
          object: "customer",
        },
      },
    } as Stripe.Event;

    const { stripe } = createStripeMock(event);

    const provider = new StripeWebhookProvider(stripe, "whsec_test_secret");

    expect(provider.verifyAndParse(payload, signature)).toEqual({
      eventId: "evt_test_customer_001",
      eventType: "customer.created",
      checkoutSession: null,
    });
  });

  it("propaga una firma inválida", () => {
    const constructEvent = vi.fn().mockImplementation(() => {
      throw new Error("Invalid Stripe signature.");
    });

    const stripe = {
      webhooks: {
        constructEvent,
      },
    } as unknown as Pick<Stripe, "webhooks">;

    const provider = new StripeWebhookProvider(stripe, "whsec_test_secret");

    expect(() => provider.verifyAndParse(payload, signature)).toThrow(
      "Invalid Stripe signature.",
    );
  });
});
