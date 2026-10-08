import type { ProductFormat } from "../../catalog/dtos/catalog.dto.js";
import type {
  CustomerType,
  FulfillmentProvider,
  FulfillmentStatus,
  OrderPaymentProvider,
  OrderStatus,
  PaymentStatus,
} from "../models/order.model.js";

export interface OrderContactDto {
  fullName: string;
  email: string;
  phone: string;
}

export interface OrderAddressDto {
  addressLine1: string;
  addressLine2: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  references: string | null;
}

export interface OrderSelectedOptionDto {
  optionId: string;
  optionName: string;
  valueId: string;
  valueLabel: string;
  value: string;
  priceModifierCents: number;
}

export interface OrderItemDto {
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl: string;
  designId: string;
  designSlug: string;
  designTitle: string;
  designImageUrl: string;
  format: ProductFormat;
  formatLabel: string;
  formatPriceAdjustmentCents: number;
  selectedOptions: OrderSelectedOptionDto[];
  quantity: number;
  basePriceCents: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  quoteId: string;
  customerType: CustomerType;
  contact: OrderContactDto;
  shippingAddress: OrderAddressDto;
  items: OrderItemDto[];
  currency: "MXN";
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentProvider: OrderPaymentProvider | null;
  paidAt: string | null;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentProvider: FulfillmentProvider | null;
  fulfillmentReference: string | null;
  fulfillmentSubmittedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
