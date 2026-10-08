import type { Types } from "mongoose";

import { OrderModel, type Order } from "../models/order.model.js";

export type CreateOrderRecord = Omit<Order, "createdAt" | "updatedAt">;

export const orderRepository = {
  create(record: CreateOrderRecord) {
    return OrderModel.create(record);
  },

  findById(orderId: Types.ObjectId) {
    return OrderModel.findById(orderId).exec();
  },

  findByQuoteId(quoteId: string) {
    return OrderModel.findOne({
      quoteId,
    }).exec();
  },

  findByQuoteIdForUser(quoteId: string, userId: Types.ObjectId) {
    return OrderModel.findOne({
      quoteId,
      customerType: "account",
      userId,
    }).exec();
  },

  findByOrderNumberForGuest(orderNumber: string) {
    return OrderModel.findOne({
      orderNumber,
      customerType: "guest",
      userId: null,
    }).exec();
  },

  findByOrderNumberForUser(orderNumber: string, userId: Types.ObjectId) {
    return OrderModel.findOne({
      orderNumber,
      customerType: "account",
      userId,
    }).exec();
  },

  findByUserId(userId: Types.ObjectId) {
    return OrderModel.find({
      customerType: "account",
      userId,
    })
      .sort({
        createdAt: -1,
      })
      .exec();
  },

  markPaidAndConfirmed(orderId: Types.ObjectId, paidAt: Date) {
    return OrderModel.findOneAndUpdate(
      {
        _id: orderId,
        paymentStatus: {
          $ne: "paid",
        },
        status: {
          $ne: "cancelled",
        },
      },
      {
        $set: {
          status: "confirmed",
          paymentStatus: "paid",
          paymentProvider: "stripe",
          paidAt,
        },
      },
      {
        new: true,
      },
    ).exec();
  },

  markPaymentFailed(orderId: Types.ObjectId) {
    return OrderModel.findOneAndUpdate(
      {
        _id: orderId,
        paymentStatus: {
          $ne: "paid",
        },
      },
      {
        $set: {
          paymentStatus: "failed",
          paymentProvider: "stripe",
        },
      },
      {
        new: true,
      },
    ).exec();
  },

  markFulfillmentSubmitted(
    orderId: Types.ObjectId,
    reference: string,
    submittedAt: Date,
  ) {
    return OrderModel.findOneAndUpdate(
      {
        _id: orderId,
        fulfillmentStatus: {
          $nin: ["submitted", "in_production", "shipped", "delivered"],
        },
      },
      {
        $set: {
          fulfillmentStatus: "submitted",
          fulfillmentProvider: "simulated",
          fulfillmentReference: reference,
          fulfillmentSubmittedAt: submittedAt,
        },
      },
      {
        new: true,
      },
    ).exec();
  },
};
