import mongoose, { Schema, model, type Model, type Types } from "mongoose";

import type { ProductFormat } from "../../catalog/dtos/catalog.dto.js";
import { PRODUCT_FORMATS } from "../../catalog/models/product.model.js";

export const QUOTE_CUSTOMER_TYPES = ["account", "guest"] as const;

export type QuoteCustomerType = (typeof QUOTE_CUSTOMER_TYPES)[number];

export interface CheckoutQuoteSelectedOption {
  optionId: string;
  optionName: string;
  valueId: string;
  valueLabel: string;
  value: string;
  priceModifierCents: number;
}

export interface CheckoutQuoteItem {
  productId: Types.ObjectId;
  productExternalId: string;
  productSlug: string;
  productName: string;
  productImageUrl: string;
  designId: Types.ObjectId;
  designExternalId: string;
  designSlug: string;
  designTitle: string;
  designImageUrl: string;
  format: ProductFormat;
  formatLabel: string;
  formatPriceAdjustmentCents: number;
  selectedOptions: CheckoutQuoteSelectedOption[];
  quantity: number;
  basePriceCents: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface CheckoutQuote {
  quoteId: string;
  customerType: QuoteCustomerType;
  userId: Types.ObjectId | null;
  guestSessionHash: string | null;
  currency: "MXN";
  items: CheckoutQuoteItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const selectedOptionSchema = new Schema<CheckoutQuoteSelectedOption>(
  {
    optionId: {
      type: String,
      required: true,
      trim: true,
    },
    optionName: {
      type: String,
      required: true,
      trim: true,
    },
    valueId: {
      type: String,
      required: true,
      trim: true,
    },
    valueLabel: {
      type: String,
      required: true,
      trim: true,
    },
    value: {
      type: String,
      required: true,
      trim: true,
    },
    priceModifierCents: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
  },
  {
    _id: false,
  },
);

const quoteItemSchema = new Schema<CheckoutQuoteItem>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productExternalId: {
      type: String,
      required: true,
      trim: true,
    },
    productSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    productImageUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => URL.canParse(value),
        message: "productImageUrl must be a valid URL.",
      },
    },
    designId: {
      type: Schema.Types.ObjectId,
      ref: "Design",
      required: true,
    },
    designExternalId: {
      type: String,
      required: true,
      trim: true,
    },
    designSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    designTitle: {
      type: String,
      required: true,
      trim: true,
    },
    designImageUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => URL.canParse(value),
        message: "designImageUrl must be a valid URL.",
      },
    },
    format: {
      type: String,
      enum: PRODUCT_FORMATS,
      required: true,
    },
    formatLabel: {
      type: String,
      required: true,
      trim: true,
    },
    formatPriceAdjustmentCents: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    selectedOptions: {
      type: [selectedOptionSchema],
      required: true,
      default: [],
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      validate: Number.isInteger,
    },
    basePriceCents: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    unitPriceCents: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    lineTotalCents: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
  },
  {
    _id: false,
  },
);

const checkoutQuoteSchema = new Schema<CheckoutQuote>(
  {
    quoteId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerType: {
      type: String,
      enum: QUOTE_CUSTOMER_TYPES,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      required: function requireUserForAccount(this: CheckoutQuote) {
        return this.customerType === "account";
      },
    },
    guestSessionHash: {
      type: String,
      default: null,
      select: false,
      required: function requireHashForGuest(this: CheckoutQuote) {
        return this.customerType === "guest";
      },
    },
    currency: {
      type: String,
      enum: ["MXN"],
      required: true,
      default: "MXN",
    },
    items: {
      type: [quoteItemSchema],
      required: true,
      validate: {
        validator: (items: CheckoutQuoteItem[]) => items.length > 0,
        message: "A checkout quote must contain at least one item.",
      },
    },
    subtotalCents: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    shippingCents: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    totalCents: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    consumedAt: {
      type: Date,
      default: null,
    },
  },
  {
    collection: "checkout_quotes",
    timestamps: true,
    versionKey: false,
  },
);

checkoutQuoteSchema.pre("validate", function validateOwner() {
  if (this.customerType === "account" && this.guestSessionHash) {
    this.invalidate(
      "guestSessionHash",
      "An account quote cannot contain a guest session hash.",
    );
  }

  if (this.customerType === "guest" && this.userId) {
    this.invalidate("userId", "A guest quote cannot contain a user.");
  }
});

checkoutQuoteSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

checkoutQuoteSchema.index({
  userId: 1,
  expiresAt: 1,
});

checkoutQuoteSchema.index({
  guestSessionHash: 1,
  expiresAt: 1,
});

export const CheckoutQuoteModel: Model<CheckoutQuote> =
  (mongoose.models.CheckoutQuote as Model<CheckoutQuote> | undefined) ??
  model<CheckoutQuote>("CheckoutQuote", checkoutQuoteSchema);
