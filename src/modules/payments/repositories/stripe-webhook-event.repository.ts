import { StripeWebhookEventModel } from "../models/stripe-webhook-event.model.js";

const WEBHOOK_EVENT_TTL_DAYS = 30;

function getExpirationDate(currentDate: Date): Date {
  return new Date(
    currentDate.getTime() + WEBHOOK_EVENT_TTL_DAYS * 24 * 60 * 60 * 1_000,
  );
}

export const stripeWebhookEventRepository = {
  createProcessing(eventId: string, eventType: string, currentDate: Date) {
    return StripeWebhookEventModel.create({
      eventId,
      eventType,
      status: "processing",
      attempts: 1,
      processedAt: null,
      lastError: null,
      expiresAt: getExpirationDate(currentDate),
    });
  },

  findByEventId(eventId: string) {
    return StripeWebhookEventModel.findOne({
      eventId,
    }).exec();
  },

  retryFailed(eventId: string, currentDate: Date) {
    return StripeWebhookEventModel.findOneAndUpdate(
      {
        eventId,
        status: "failed",
      },
      {
        $set: {
          status: "processing",
          processedAt: null,
          lastError: null,
          expiresAt: getExpirationDate(currentDate),
        },
        $inc: {
          attempts: 1,
        },
      },
      {
        new: true,
      },
    ).exec();
  },

  markCompleted(eventId: string, processedAt: Date) {
    return StripeWebhookEventModel.findOneAndUpdate(
      {
        eventId,
        status: "processing",
      },
      {
        $set: {
          status: "completed",
          processedAt,
          lastError: null,
        },
      },
      {
        new: true,
      },
    ).exec();
  },

  markFailed(eventId: string, errorMessage: string) {
    return StripeWebhookEventModel.findOneAndUpdate(
      {
        eventId,
        status: "processing",
      },
      {
        $set: {
          status: "failed",
          lastError: errorMessage,
        },
      },
      {
        new: true,
      },
    ).exec();
  },
};
