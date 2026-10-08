import Stripe from "stripe";

import { env } from "../../config/env.js";
import type {
  CheckoutSessionResult,
  CreateCheckoutSessionInput,
  PaymentLineItem,
  PaymentProvider,
} from "./payment-provider.js";

type StripeClient = Pick<Stripe, "checkout">;

function mapLineItem(
  item: PaymentLineItem,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: item.quantity,
    price_data: {
      currency: "mxn",
      unit_amount: item.unitAmountCents,
      product_data: {
        name: item.name,
        description: item.description,
        images: [item.imageUrl],
      },
    },
  };
}

function createShippingLineItem(
  shippingCents: number,
): Stripe.Checkout.SessionCreateParams.LineItem {
  return {
    quantity: 1,
    price_data: {
      currency: "mxn",
      unit_amount: shippingCents,
      product_data: {
        name: "Envío",
        description: "Envío nacional del pedido OHO 2.0",
      },
    },
  };
}

export class StripePaymentProvider implements PaymentProvider {
  constructor(private readonly stripe: StripeClient) {}

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
    idempotencyKey: string,
  ): Promise<CheckoutSessionResult> {
    const lineItems = input.items.map(mapLineItem);

    if (input.shippingCents > 0) {
      lineItems.push(createShippingLineItem(input.shippingCents));
    }

    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer_email: input.customerEmail,
        client_reference_id: input.orderId,
        line_items: lineItems,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        expires_at: Math.floor(input.expiresAt.getTime() / 1_000),
        locale: "es",
        metadata: {
          orderId: input.orderId,
          orderNumber: input.orderNumber,
        },
        payment_intent_data: {
          metadata: {
            orderId: input.orderId,
            orderNumber: input.orderNumber,
          },
        },
      },
      {
        idempotencyKey,
      },
    );

    if (!session.url) {
      throw new Error("Stripe did not return a Checkout URL.");
    }

    return {
      checkoutSessionId: session.id,
      checkoutUrl: session.url,
      expiresAt: new Date(session.expires_at * 1_000),
    };
  }
}

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY);

export const paymentProvider = new StripePaymentProvider(stripeClient);
