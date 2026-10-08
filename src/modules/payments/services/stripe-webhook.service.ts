import type { Types } from "mongoose";

import { orderRepository } from "../../orders/repositories/order.repository.js";
import { stripeWebhookProvider } from "../../../providers/payment/stripe-webhook.provider.js";
import type { VerifiedStripeWebhookEvent } from "../../../providers/payment/stripe-webhook.provider.js";
import { paymentAttemptRepository } from "../repositories/payment-attempt.repository.js";
import { stripeWebhookEventRepository } from "../repositories/stripe-webhook-event.repository.js";
import { paymentFulfillmentService } from "./payment-fulfillment.service.js";

export type StripeWebhookResultStatus = "processed" | "duplicate" | "ignored";

export interface StripeWebhookResult {
  eventId: string;
  eventType: string;
  status: StripeWebhookResultStatus;
}

export class StripeWebhookSignatureError extends Error {
  readonly code = "INVALID_STRIPE_SIGNATURE";

  constructor() {
    super("La firma del webhook de Stripe no es válida.");

    this.name = "StripeWebhookSignatureError";
  }
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11_000
  );
}

async function claimEvent(
  event: VerifiedStripeWebhookEvent,
  currentDate: Date,
): Promise<"acquired" | "duplicate"> {
  try {
    await stripeWebhookEventRepository.createProcessing(
      event.eventId,
      event.eventType,
      currentDate,
    );

    return "acquired";
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const existing = await stripeWebhookEventRepository.findByEventId(
      event.eventId,
    );

    if (!existing) {
      throw error;
    }

    if (existing.status !== "failed") {
      return "duplicate";
    }

    const retry = await stripeWebhookEventRepository.retryFailed(
      event.eventId,
      currentDate,
    );

    return retry ? "acquired" : "duplicate";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 1_000);
  }

  return "Unknown webhook processing error.";
}

function validateOrderOwnership(
  attemptOrderId: Types.ObjectId,
  event: VerifiedStripeWebhookEvent,
): void {
  const session = event.checkoutSession;

  if (!session) {
    throw new Error("Stripe event does not contain a Checkout Session.");
  }

  const expectedOrderId = attemptOrderId.toString();

  if (
    session.orderId !== expectedOrderId ||
    session.clientReferenceId !== expectedOrderId
  ) {
    throw new Error(
      "Stripe Checkout metadata does not match the payment attempt.",
    );
  }
}

async function processPaidSession(
  event: VerifiedStripeWebhookEvent,
  currentDate: Date,
): Promise<void> {
  const session = event.checkoutSession;

  if (!session) {
    throw new Error("Paid event does not contain a Checkout Session.");
  }

  const attempt = await paymentAttemptRepository.findByCheckoutSessionId(
    session.checkoutSessionId,
  );

  if (!attempt) {
    throw new Error("Payment attempt was not found.");
  }

  validateOrderOwnership(attempt.orderId, event);

  const order = await orderRepository.findById(attempt.orderId);

  if (!order) {
    throw new Error("Payment order was not found.");
  }

  if (
    attempt.currency !== order.currency ||
    attempt.amountTotalCents !== order.totalCents
  ) {
    throw new Error("Stripe payment amount does not match the order.");
  }

  await paymentAttemptRepository.markCompleted(
    session.checkoutSessionId,
    session.paymentIntentId,
    currentDate,
  );

  await paymentFulfillmentService.completePaidOrder(
    attempt.orderId,
    currentDate,
  );
}

async function processFailedSession(
  event: VerifiedStripeWebhookEvent,
  currentDate: Date,
): Promise<void> {
  const session = event.checkoutSession;

  if (!session) {
    throw new Error("Failed event does not contain a Checkout Session.");
  }

  const attempt = await paymentAttemptRepository.findByCheckoutSessionId(
    session.checkoutSessionId,
  );

  if (!attempt) {
    throw new Error("Payment attempt was not found.");
  }

  validateOrderOwnership(attempt.orderId, event);

  await paymentAttemptRepository.markFailed(
    session.checkoutSessionId,
    currentDate,
  );

  await orderRepository.markPaymentFailed(attempt.orderId);
}

async function processExpiredSession(
  event: VerifiedStripeWebhookEvent,
): Promise<void> {
  const session = event.checkoutSession;

  if (!session) {
    throw new Error("Expired event does not contain a Checkout Session.");
  }

  await paymentAttemptRepository.markExpired(session.checkoutSessionId);
}

function isPaidEvent(eventType: string): boolean {
  return (
    eventType === "checkout.session.completed" ||
    eventType === "checkout.session.async_payment_succeeded"
  );
}

export const stripeWebhookService = {
  async process(
    payload: Buffer,
    signature: string,
    currentDate = new Date(),
  ): Promise<StripeWebhookResult> {
    let event: VerifiedStripeWebhookEvent;

    try {
      event = stripeWebhookProvider.verifyAndParse(payload, signature);
    } catch {
      throw new StripeWebhookSignatureError();
    }

    const claim = await claimEvent(event, currentDate);

    if (claim === "duplicate") {
      return {
        eventId: event.eventId,
        eventType: event.eventType,
        status: "duplicate",
      };
    }

    try {
      let status: "processed" | "ignored" = "ignored";

      if (
        isPaidEvent(event.eventType) &&
        event.checkoutSession?.paymentStatus === "paid"
      ) {
        await processPaidSession(event, currentDate);

        status = "processed";
      } else if (event.eventType === "checkout.session.async_payment_failed") {
        await processFailedSession(event, currentDate);

        status = "processed";
      } else if (event.eventType === "checkout.session.expired") {
        await processExpiredSession(event);

        status = "processed";
      }

      await stripeWebhookEventRepository.markCompleted(
        event.eventId,
        currentDate,
      );

      return {
        eventId: event.eventId,
        eventType: event.eventType,
        status,
      };
    } catch (error) {
      await stripeWebhookEventRepository.markFailed(
        event.eventId,
        getErrorMessage(error),
      );

      throw error;
    }
  },
};
