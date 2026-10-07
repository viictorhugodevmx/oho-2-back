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
};
