import type { Types } from "mongoose";

import { GuestOrderAccessModel } from "../models/guest-order-access.model.js";

export interface CreateGuestOrderAccessRecord {
  orderId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
}

export const guestOrderAccessRepository = {
  create(record: CreateGuestOrderAccessRecord) {
    return GuestOrderAccessModel.create({
      ...record,
      revokedAt: null,
      accessCount: 0,
      lastAccessedAt: null,
    });
  },

  findByOrderId(orderId: Types.ObjectId) {
    return GuestOrderAccessModel.findOne({
      orderId,
    }).exec();
  },

  recordActiveAccess(
    orderId: Types.ObjectId,
    tokenHash: string,
    accessedAt: Date,
  ) {
    return GuestOrderAccessModel.findOneAndUpdate(
      {
        orderId,
        tokenHash,
        revokedAt: null,
        expiresAt: {
          $gt: accessedAt,
        },
      },
      {
        $inc: {
          accessCount: 1,
        },
        $set: {
          lastAccessedAt: accessedAt,
        },
      },
      {
        new: true,
      },
    ).exec();
  },
};
