import type { Types } from "mongoose";

import {
  PaymentAttemptModel,
  type PaymentAttempt,
} from "../models/payment-attempt.model.js";

export type CreatePaymentAttemptRecord = Omit<
  PaymentAttempt,
  "createdAt" | "updatedAt"
>;

export const paymentAttemptRepository = {
  create(record: CreatePaymentAttemptRecord) {
    return PaymentAttemptModel.create(record);
  },

  findActiveByOrderId(orderId: Types.ObjectId, currentDate: Date) {
    return PaymentAttemptModel.findOne({
      orderId,
      status: "open",
      expiresAt: {
        $gt: currentDate,
      },
    })
      .select("+checkoutUrl")
      .sort({
        createdAt: -1,
      })
      .exec();
  },

  findByCheckoutSessionId(checkoutSessionId: string) {
    return PaymentAttemptModel.findOne({
      checkoutSessionId,
    }).exec();
  },

  markCompleted(
    checkoutSessionId: string,
    paymentIntentId: string | null,
    completedAt: Date,
  ) {
    return PaymentAttemptModel.findOneAndUpdate(
      {
        checkoutSessionId,
        status: {
          $ne: "completed",
        },
      },
      {
        $set: {
          status: "completed",
          paymentIntentId,
          completedAt,
          failedAt: null,
        },
      },
      {
        new: true,
      },
    ).exec();
  },

  markExpired(checkoutSessionId: string) {
    return PaymentAttemptModel.findOneAndUpdate(
      {
        checkoutSessionId,
        status: "open",
      },
      {
        $set: {
          status: "expired",
        },
      },
      {
        new: true,
      },
    ).exec();
  },

  markFailed(checkoutSessionId: string, failedAt: Date) {
    return PaymentAttemptModel.findOneAndUpdate(
      {
        checkoutSessionId,
        status: {
          $ne: "completed",
        },
      },
      {
        $set: {
          status: "failed",
          failedAt,
        },
      },
      {
        new: true,
      },
    ).exec();
  },
};
