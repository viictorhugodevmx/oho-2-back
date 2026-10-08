import type Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { StripePaymentProvider } from "../../../src/providers/payment/stripe-payment.provider.js";

const expiresAt = new Date("2026-10-07T20:30:00.000Z");

const input = {
  orderId: "507f1f77bcf86cd799439011",
  orderNumber: "OHO-20261007-A1B2C3D4",
  customerEmail: "cliente@example.com",
  currency: "mxn" as const,
  items: [
    {
      name: "Hoodie After Hours",
      description: "Front Row Pressure · Estándar · Talla: M",
      imageUrl: "https://example.com/product.jpg",
      unitAmountCents: 84_900,
      quantity: 1,
    },
  ],
  shippingCents: 14_900,
  successUrl:
    "http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}",
  cancelUrl:
    "http://localhost:3000/checkout?payment=cancelled&order=OHO-20261007-A1B2C3D4",
  expiresAt,
};

function createStripeMock(
  checkoutUrl:
    string | null = "https://checkout.stripe.com/c/pay/cs_test_checkout_001",
) {
  const create = vi.fn().mockResolvedValue({
    id: "cs_test_checkout_001",
    url: checkoutUrl,
    expires_at: Math.floor(expiresAt.getTime() / 1_000),
  });

  const stripe = {
    checkout: {
      sessions: {
        create,
      },
    },
  } as unknown as Pick<Stripe, "checkout">;

  return {
    stripe,
    create,
  };
}

describe("StripePaymentProvider", () => {
  it("crea una sesión con importes autoritativos e idempotencia", async () => {
    const { stripe, create } = createStripeMock();

    const provider = new StripePaymentProvider(stripe);

    const result = await provider.createCheckoutSession(
      input,
      "stripe-order-507f1f77bcf86cd799439011",
    );

    expect(result).toEqual({
      checkoutSessionId: "cs_test_checkout_001",
      checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_checkout_001",
      expiresAt,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "payment",
        customer_email: "cliente@example.com",
        client_reference_id: "507f1f77bcf86cd799439011",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        metadata: {
          orderId: "507f1f77bcf86cd799439011",
          orderNumber: "OHO-20261007-A1B2C3D4",
        },
      }),
      {
        idempotencyKey: "stripe-order-507f1f77bcf86cd799439011",
      },
    );
  });

  it("envía artículos y envío como líneas separadas", async () => {
    const { stripe, create } = createStripeMock();

    const provider = new StripePaymentProvider(stripe);

    await provider.createCheckoutSession(
      input,
      "stripe-order-507f1f77bcf86cd799439011",
    );

    const params = create.mock.calls[0]?.[0];

    expect(params.line_items).toHaveLength(2);

    expect(params.line_items[0]).toMatchObject({
      quantity: 1,
      price_data: {
        currency: "mxn",
        unit_amount: 84_900,
        product_data: {
          name: "Hoodie After Hours",
        },
      },
    });

    expect(params.line_items[1]).toMatchObject({
      quantity: 1,
      price_data: {
        currency: "mxn",
        unit_amount: 14_900,
        product_data: {
          name: "Envío",
        },
      },
    });
  });

  it("omite la línea de envío cuando es gratuito", async () => {
    const { stripe, create } = createStripeMock();

    const provider = new StripePaymentProvider(stripe);

    await provider.createCheckoutSession(
      {
        ...input,
        shippingCents: 0,
      },
      "stripe-order-507f1f77bcf86cd799439011",
    );

    const params = create.mock.calls[0]?.[0];

    expect(params.line_items).toHaveLength(1);
  });

  it("rechaza una sesión sin URL de Checkout", async () => {
    const { stripe } = createStripeMock(null);

    const provider = new StripePaymentProvider(stripe);

    await expect(
      provider.createCheckoutSession(
        input,
        "stripe-order-507f1f77bcf86cd799439011",
      ),
    ).rejects.toThrow("Stripe did not return a Checkout URL.");
  });
});
