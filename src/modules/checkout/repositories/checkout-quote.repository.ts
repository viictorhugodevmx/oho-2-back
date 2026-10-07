import type { Types } from "mongoose";

import {
  CheckoutQuoteModel,
  type CheckoutQuoteItem,
} from "../models/checkout-quote.model.js";

interface CheckoutQuoteRecord {
  quoteId: string;
  currency: "MXN";
  items: CheckoutQuoteItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  expiresAt: Date;
  consumedAt: Date | null;
}

interface AccountQuoteOwner {
  customerType: "account";
  userId: Types.ObjectId;
  guestSessionHash?: never;
}

interface GuestQuoteOwner {
  customerType: "guest";
  userId?: never;
  guestSessionHash: string;
}

export type CreateCheckoutQuoteRecord = CheckoutQuoteRecord &
  (AccountQuoteOwner | GuestQuoteOwner);

export const checkoutQuoteRepository = {
  create(record: CreateCheckoutQuoteRecord) {
    return CheckoutQuoteModel.create(record);
  },

  findActiveForAccount(
    quoteId: string,
    userId: Types.ObjectId,
    currentDate = new Date(),
  ) {
    return CheckoutQuoteModel.findOne({
      quoteId,
      customerType: "account",
      userId,
      consumedAt: null,
      expiresAt: {
        $gt: currentDate,
      },
    }).exec();
  },

  findActiveForGuest(
    quoteId: string,
    guestSessionHash: string,
    currentDate = new Date(),
  ) {
    return CheckoutQuoteModel.findOne({
      quoteId,
      customerType: "guest",
      guestSessionHash,
      consumedAt: null,
      expiresAt: {
        $gt: currentDate,
      },
    }).exec();
  },
};
