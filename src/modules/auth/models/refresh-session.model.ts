import mongoose, { Schema, model, type Types } from "mongoose";

export interface RefreshSession {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBySessionId: Types.ObjectId | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const refreshSessionSchema = new Schema<RefreshSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
    replacedBySessionId: {
      type: Schema.Types.ObjectId,
      ref: "RefreshSession",
      default: null,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      maxlength: 64,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

refreshSessionSchema.index({
  userId: 1,
  revokedAt: 1,
  expiresAt: 1,
});

export const RefreshSessionModel =
  mongoose.models.RefreshSession ??
  model<RefreshSession>("RefreshSession", refreshSessionSchema);
