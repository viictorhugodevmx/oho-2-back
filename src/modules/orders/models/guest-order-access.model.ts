import { Schema, model, models, type Types } from "mongoose";

export interface GuestOrderAccess {
  orderId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  accessCount: number;
  lastAccessedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const guestOrderAccessSchema = new Schema<GuestOrderAccess>(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: {
        expireAfterSeconds: 0,
      },
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    accessCount: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
      validate: Number.isInteger,
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

guestOrderAccessSchema.index({
  orderId: 1,
  revokedAt: 1,
  expiresAt: 1,
});

export const GuestOrderAccessModel =
  models.GuestOrderAccess ??
  model<GuestOrderAccess>("GuestOrderAccess", guestOrderAccessSchema);
