import { Schema, model, models, type Types } from "mongoose";
import { PRODUCT_FORMATS } from "../../catalog/models/product.model.js";

export type ProductFormat = (typeof PRODUCT_FORMATS)[number];

export const CUSTOMER_TYPES = ["account", "guest"] as const;

export const ORDER_STATUSES = ["pending", "confirmed", "cancelled"] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
  "refunded",
] as const;

export const FULFILLMENT_STATUSES = [
  "pending",
  "submitted",
  "in_production",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export interface OrderContact {
  firstName: string;
  lastName: string;
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

export interface OrderItem {
  productId: Types.ObjectId;
  productExternalId: string;
  productSlug: string;
  productName: string;
  designId: Types.ObjectId;
  designExternalId: string;
  designSlug: string;
  designTitle: string;
  format: ProductFormat;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  previewImageUrl: string;
  printProviderProductId?: string;
  printProviderFileId?: string;
}

export interface Order {
  orderNumber: string;
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
  fulfillmentStatus: FulfillmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const contactSchema = new Schema<OrderContact>(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
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
      maxlength: 120,
    },
    state: {
      type: String,
      required: true,
      trim: true,
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
    format: {
      type: String,
      enum: PRODUCT_FORMATS,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
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
    previewImageUrl: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: (value: string) => URL.canParse(value),
        message: "previewImageUrl must be a valid URL",
      },
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
        message: "An order must contain at least one item",
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
    fulfillmentStatus: {
      type: String,
      enum: FULFILLMENT_STATUSES,
      default: "pending",
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ "contact.email": 1, createdAt: -1 });
orderSchema.index({
  status: 1,
  paymentStatus: 1,
  fulfillmentStatus: 1,
});

export const OrderModel = models.Order ?? model<Order>("Order", orderSchema);
