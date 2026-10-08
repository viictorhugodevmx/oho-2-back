import Stripe from "stripe";

import { env } from "../../config/env.js";

export interface VerifiedCheckoutSession {
  checkoutSessionId: string;
  paymentStatus: string;
  paymentIntentId: string | null;
  clientReferenceId: string | null;
  orderId: string | null;
  orderNumber: string | null;
}

export interface VerifiedStripeWebhookEvent {
  eventId: string;
  eventType: string;
  checkoutSession: VerifiedCheckoutSession | null;
}

type StripeWebhookClient = Pick<Stripe, "webhooks">;

function resolvePaymentIntentId(
  paymentIntent: string | Stripe.PaymentIntent | null,
): string | null {
  if (typeof paymentIntent === "string") {
    return paymentIntent;
  }

  return paymentIntent?.id ?? null;
}

function isCheckoutSession(value: unknown): value is Stripe.Checkout.Session {
  return (
    typeof value === "object" &&
    value !== null &&
    "object" in value &&
    value.object === "checkout.session"
  );
}

export class StripeWebhookProvider {
  constructor(
    private readonly stripe: StripeWebhookClient,
    private readonly webhookSecret: string = env.STRIPE_WEBHOOK_SECRET,
  ) {}

  verifyAndParse(
    payload: Buffer,
    signature: string,
  ): VerifiedStripeWebhookEvent {
    const event = this.stripe.webhooks.constructEvent(
      payload,
      signature,
      this.webhookSecret,
    );

    const eventObject = event.data.object;

    if (!isCheckoutSession(eventObject)) {
      return {
        eventId: event.id,
        eventType: event.type,
        checkoutSession: null,
      };
    }

    return {
      eventId: event.id,
      eventType: event.type,
      checkoutSession: {
        checkoutSessionId: eventObject.id,
        paymentStatus: eventObject.payment_status,
        paymentIntentId: resolvePaymentIntentId(eventObject.payment_intent),
        clientReferenceId: eventObject.client_reference_id,
        orderId: eventObject.metadata?.orderId ?? null,
        orderNumber: eventObject.metadata?.orderNumber ?? null,
      },
    };
  }
}

const stripeClient = new Stripe(env.STRIPE_SECRET_KEY);

export const stripeWebhookProvider = new StripeWebhookProvider(stripeClient);
