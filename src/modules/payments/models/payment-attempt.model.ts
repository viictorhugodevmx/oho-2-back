import mongoose, { Schema, model, type Model, type Types } from "mongoose";

export const PAYMENT_PROVIDERS = ["stripe"] as const;

export const PAYMENT_ATTEMPT_STATUSES = [
  "open",
  "completed",
  "expired",
  "failed",
] as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

export interface PaymentAttempt {
  orderId: Types.ObjectId;
  provider: PaymentProvider;
  checkoutSessionId: string;
  checkoutUrl: string;
  currency: "MXN";
  amountTotalCents: number;
  status: PaymentAttemptStatus;
  expiresAt: Date;
  paymentIntentId: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const paymentAttemptSchema = new Schema<PaymentAttempt>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: PAYMENT_PROVIDERS,
      required: true,
    },
    checkoutSessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: /^cs_(?:test|live)_[A-Za-z0-9_]+$/,
    },
    checkoutUrl: {
      type: String,
      required: true,
      trim: true,
      select: false,
      validate: {
        validator: (value: string) => URL.canParse(value),
        message: "checkoutUrl must be a valid URL.",
      },
    },
    currency: {
      type: String,
      enum: ["MXN"],
      required: true,
    },
    amountTotalCents: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    status: {
      type: String,
      enum: PAYMENT_ATTEMPT_STATUSES,
      required: true,
      default: "open",
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    paymentIntentId: {
      type: String,
      trim: true,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

paymentAttemptSchema.index({
  orderId: 1,
  status: 1,
  expiresAt: 1,
});

const existingPaymentAttemptModel = mongoose.models.PaymentAttempt as
  Model<PaymentAttempt> | undefined;

export const PaymentAttemptModel =
  existingPaymentAttemptModel ??
  model<PaymentAttempt>("PaymentAttempt", paymentAttemptSchema);
