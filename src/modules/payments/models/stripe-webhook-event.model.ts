import mongoose, { Schema, model, type Model } from "mongoose";

export const STRIPE_WEBHOOK_EVENT_STATUSES = [
  "processing",
  "completed",
  "failed",
] as const;

export type StripeWebhookEventStatus =
  (typeof STRIPE_WEBHOOK_EVENT_STATUSES)[number];

export interface StripeWebhookEvent {
  eventId: string;
  eventType: string;
  status: StripeWebhookEventStatus;
  attempts: number;
  processedAt: Date | null;
  lastError: string | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const stripeWebhookEventSchema = new Schema<StripeWebhookEvent>(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^evt_[A-Za-z0-9_]+$/,
    },
    eventType: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    status: {
      type: String,
      enum: STRIPE_WEBHOOK_EVENT_STATUSES,
      required: true,
      default: "processing",
    },
    attempts: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
      default: 1,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      trim: true,
      maxlength: 1_000,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

stripeWebhookEventSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

const existingStripeWebhookEventModel = mongoose.models.StripeWebhookEvent as
  Model<StripeWebhookEvent> | undefined;

export const StripeWebhookEventModel =
  existingStripeWebhookEventModel ??
  model<StripeWebhookEvent>("StripeWebhookEvent", stripeWebhookEventSchema);
