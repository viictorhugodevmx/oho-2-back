import mongoose, { Schema, model, type Types } from "mongoose";

export const IDEMPOTENCY_OPERATIONS = [
  "create_order",
  "create_payment",
  "submit_fulfillment",
] as const;

export const IDEMPOTENCY_STATUSES = [
  "processing",
  "completed",
  "failed",
] as const;

export type IdempotencyOperation = (typeof IDEMPOTENCY_OPERATIONS)[number];

export type IdempotencyStatus = (typeof IDEMPOTENCY_STATUSES)[number];

export interface IdempotencyRecord {
  operation: IdempotencyOperation;
  keyHash: string;
  requestHash: string;
  status: IdempotencyStatus;
  orderId: Types.ObjectId | null;
  responseStatusCode: number | null;
  errorCode: string | null;
  lockedAt: Date;
  completedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const idempotencyRecordSchema = new Schema<IdempotencyRecord>(
  {
    operation: {
      type: String,
      enum: IDEMPOTENCY_OPERATIONS,
      required: true,
    },
    keyHash: {
      type: String,
      required: true,
      select: false,
    },
    requestHash: {
      type: String,
      required: true,
      select: false,
    },
    status: {
      type: String,
      enum: IDEMPOTENCY_STATUSES,
      default: "processing",
      required: true,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    responseStatusCode: {
      type: Number,
      min: 100,
      max: 599,
      default: null,
      validate: {
        validator: (value: number | null) =>
          value === null || Number.isInteger(value),
        message: "responseStatusCode must be an integer",
      },
    },
    errorCode: {
      type: String,
      trim: true,
      maxlength: 100,
      default: null,
    },
    lockedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: {
        expireAfterSeconds: 0,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

idempotencyRecordSchema.index(
  {
    operation: 1,
    keyHash: 1,
  },
  {
    unique: true,
  },
);

idempotencyRecordSchema.index({
  status: 1,
  lockedAt: 1,
});

export const IdempotencyRecordModel =
  mongoose.models.IdempotencyRecord ??
  model<IdempotencyRecord>("IdempotencyRecord", idempotencyRecordSchema);
