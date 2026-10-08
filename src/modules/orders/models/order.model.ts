import mongoose, { Schema, model, type Model, type Types } from "mongoose";

import { PRODUCT_FORMATS } from "../../catalog/models/product.model.js";

export type ProductFormat = (typeof PRODUCT_FORMATS)[number];

export const CUSTOMER_TYPES = ["account", "guest"] as const;

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "completed",
  "cancelled",
] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "paid",
  "failed",
  "refunded",
] as const;

export const FULFILLMENT_STATUSES = [
  "not_requested",
  "pending",
  "submitted",
  "in_production",
  "shipped",
  "delivered",
  "failed",
  "cancelled",
] as const;

export const ORDER_PAYMENT_PROVIDERS = ["stripe"] as const;

export const FULFILLMENT_PROVIDERS = ["simulated"] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];
export type OrderPaymentProvider = (typeof ORDER_PAYMENT_PROVIDERS)[number];
export type FulfillmentProvider = (typeof FULFILLMENT_PROVIDERS)[number];

export interface OrderContact {
  fullName: string;
  email: string;
  phone: string;
}

export interface OrderAddress {
  addressLine1: string;
  addressLine2?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  references?: string;
}

export interface OrderSelectedOption {
  optionId: string;
  optionName: string;
  valueId: string;
  valueLabel: string;
  value: string;
  priceModifierCents: number;
}

export interface OrderItem {
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
  selectedOptions: OrderSelectedOption[];
  quantity: number;
  basePriceCents: number;
  unitPriceCents: number;
  lineTotalCents: number;
  printProviderProductId?: string;
  printProviderFileId?: string;
}

export interface Order {
  orderNumber: string;
  quoteId: string;
  customerType: CustomerType;
  userId: Types.ObjectId | null;
  contact: OrderContact;
  shippingAddress: OrderAddress;
  items: OrderItem[];
  currency: "MXN";
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentProvider: OrderPaymentProvider | null;
  paidAt: Date | null;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentProvider: FulfillmentProvider | null;
  fulfillmentReference: string | null;
  fulfillmentSubmittedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const urlValidator = {
  validator: (value: string) => URL.canParse(value),
  message: "{PATH} must be a valid URL.",
};

const contactSchema = new Schema<OrderContact>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 160,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      minlength: 7,
      maxlength: 20,
    },
  },
  {
    _id: false,
  },
);

const addressSchema = new Schema<OrderAddress>(
  {
    addressLine1: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 200,
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    neighborhood: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    state: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    postalCode: {
      type: String,
      required: true,
      trim: true,
      minlength: 4,
      maxlength: 12,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
      default: "México",
    },
    references: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    _id: false,
  },
);

const selectedOptionSchema = new Schema<OrderSelectedOption>(
  {
    optionId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    optionName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    valueId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    valueLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    value: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
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

const orderItemSchema = new Schema<OrderItem>(
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
      maxlength: 120,
    },
    productSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    productImageUrl: {
      type: String,
      required: true,
      trim: true,
      validate: urlValidator,
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
      maxlength: 120,
    },
    designSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    designTitle: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    designImageUrl: {
      type: String,
      required: true,
      trim: true,
      validate: urlValidator,
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
      maxlength: 120,
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
    printProviderProductId: {
      type: String,
      trim: true,
    },
    printProviderFileId: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const orderSchema = new Schema<Order>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      match: /^OHO-[A-Z0-9-]+$/,
    },
    quoteId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    customerType: {
      type: String,
      enum: CUSTOMER_TYPES,
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      required: function requireUserForAccount(this: Order) {
        return this.customerType === "account";
      },
    },
    contact: {
      type: contactSchema,
      required: true,
    },
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: OrderItem[]) => items.length > 0,
        message: "An order must contain at least one item.",
      },
    },
    currency: {
      type: String,
      enum: ["MXN"],
      default: "MXN",
      required: true,
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
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
      required: true,
    },
    paymentProvider: {
      type: String,
      enum: ORDER_PAYMENT_PROVIDERS,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    fulfillmentStatus: {
      type: String,
      enum: FULFILLMENT_STATUSES,
      default: "not_requested",
      required: true,
    },
    fulfillmentProvider: {
      type: String,
      enum: FULFILLMENT_PROVIDERS,
      default: null,
    },
    fulfillmentReference: {
      type: String,
      trim: true,
      maxlength: 200,
      default: null,
    },
    fulfillmentSubmittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

orderSchema.index({
  userId: 1,
  createdAt: -1,
});

orderSchema.index({
  "contact.email": 1,
  createdAt: -1,
});

orderSchema.index({
  status: 1,
  paymentStatus: 1,
  fulfillmentStatus: 1,
});

export const OrderModel: Model<Order> =
  (mongoose.models.Order as Model<Order> | undefined) ??
  model<Order>("Order", orderSchema);
