import type { Types } from "mongoose";

import type { OrderAddressDto, OrderDto } from "../dtos/order.dto.js";
import type { Order } from "../models/order.model.js";

type OrderRecord = Order & {
  _id: Types.ObjectId;
};

function toNullable(value: string | undefined): string | null {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function mapAddress(address: Order["shippingAddress"]): OrderAddressDto {
  return {
    addressLine1: address.addressLine1,
    addressLine2: toNullable(address.addressLine2),
    neighborhood: toNullable(address.neighborhood),
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    country: address.country,
    references: toNullable(address.references),
  };
}

export function mapOrderToDto(order: OrderRecord): OrderDto {
  return {
    id: order._id.toString(),
    orderNumber: order.orderNumber,
    quoteId: order.quoteId,
    customerType: order.customerType,
    contact: {
      fullName: order.contact.fullName,
      email: order.contact.email,
      phone: order.contact.phone,
    },
    shippingAddress: mapAddress(order.shippingAddress),
    items: order.items.map((item) => ({
      productId: item.productExternalId,
      productSlug: item.productSlug,
      productName: item.productName,
      productImageUrl: item.productImageUrl,
      designId: item.designExternalId,
      designSlug: item.designSlug,
      designTitle: item.designTitle,
      designImageUrl: item.designImageUrl,
      format: item.format,
      formatLabel: item.formatLabel,
      formatPriceAdjustmentCents: item.formatPriceAdjustmentCents,
      selectedOptions: item.selectedOptions.map((option) => ({
        optionId: option.optionId,
        optionName: option.optionName,
        valueId: option.valueId,
        valueLabel: option.valueLabel,
        value: option.value,
        priceModifierCents: option.priceModifierCents,
      })),
      quantity: item.quantity,
      basePriceCents: item.basePriceCents,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents: item.lineTotalCents,
    })),
    currency: order.currency,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}
