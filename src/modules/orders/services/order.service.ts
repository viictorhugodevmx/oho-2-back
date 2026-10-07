import type { Types } from "mongoose";

import type { CheckoutQuoteItem } from "../../checkout/models/checkout-quote.model.js";
import { checkoutQuoteRepository } from "../../checkout/repositories/checkout-quote.repository.js";
import type { OrderDto } from "../dtos/order.dto.js";
import { mapOrderToDto } from "../mappers/order.mapper.js";
import type { OrderAddress, OrderItem } from "../models/order.model.js";
import { orderRepository } from "../repositories/order.repository.js";
import type { CreateOrderBody } from "../schemas/order.schemas.js";
import {
  idempotencyService,
  type IdempotencyErrorCode,
} from "./idempotency.service.js";
import { orderNumberService } from "./order-number.service.js";

export type OrderServiceErrorCode =
  | "QUOTE_NOT_FOUND"
  | "QUOTE_EXPIRED"
  | "QUOTE_ALREADY_CONSUMED"
  | "ORDER_NOT_FOUND";

export class OrderServiceError extends Error {
  constructor(
    public readonly code: OrderServiceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OrderServiceError";
  }
}

interface CreateAccountOrderInput {
  userId: Types.ObjectId;
  idempotencyKey: string;
  body: CreateOrderBody;
}

export interface CreateAccountOrderResult {
  order: OrderDto;
  responseStatusCode: number;
  replayed: boolean;
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function buildShippingAddress(
  input: CreateOrderBody["shippingAddress"],
): OrderAddress {
  const address: OrderAddress = {
    addressLine1: input.addressLine1,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: input.country,
  };

  if (input.addressLine2 !== undefined) {
    address.addressLine2 = input.addressLine2;
  }

  if (input.neighborhood !== undefined) {
    address.neighborhood = input.neighborhood;
  }

  if (input.references !== undefined) {
    address.references = input.references;
  }

  return address;
}

function buildOrderItems(quoteItems: CheckoutQuoteItem[]): OrderItem[] {
  return quoteItems.map((item) => ({
    productId: item.productId,
    productExternalId: item.productExternalId,
    productSlug: item.productSlug,
    productName: item.productName,
    productImageUrl: item.productImageUrl,
    designId: item.designId,
    designExternalId: item.designExternalId,
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
  }));
}

async function rejectClaim(
  recordId: Types.ObjectId,
  code: OrderServiceErrorCode,
  message: string,
  currentDate: Date,
): Promise<never> {
  await idempotencyService.fail(recordId, code, currentDate);

  throw new OrderServiceError(code, message);
}

async function failUnexpectedClaim(
  recordId: Types.ObjectId,
  currentDate: Date,
): Promise<void> {
  await idempotencyService.fail(recordId, "INTERNAL_SERVER_ERROR", currentDate);
}

export const orderService = {
  async createForAccount(
    input: CreateAccountOrderInput,
    currentDate = new Date(),
  ): Promise<CreateAccountOrderResult> {
    const claim = await idempotencyService.claimForAccount(
      {
        userId: input.userId,
        key: input.idempotencyKey,
        request: input.body,
      },
      currentDate,
    );

    if (claim.status === "replay") {
      const existingOrder = await orderRepository.findById(claim.orderId);

      if (!existingOrder) {
        throw new Error("The idempotency record references a missing order.");
      }

      return {
        order: mapOrderToDto(existingOrder),
        responseStatusCode: claim.responseStatusCode,
        replayed: true,
      };
    }

    const quote = await checkoutQuoteRepository.findForAccount(
      input.body.quoteId,
      input.userId,
    );

    if (!quote) {
      return rejectClaim(
        claim.recordId,
        "QUOTE_NOT_FOUND",
        "La cotización no existe o no pertenece a tu cuenta.",
        currentDate,
      );
    }

    if (quote.consumedAt) {
      return rejectClaim(
        claim.recordId,
        "QUOTE_ALREADY_CONSUMED",
        "La cotización ya fue utilizada para crear un pedido.",
        currentDate,
      );
    }

    if (quote.expiresAt.getTime() <= currentDate.getTime()) {
      return rejectClaim(
        claim.recordId,
        "QUOTE_EXPIRED",
        "La cotización ha expirado.",
        currentDate,
      );
    }

    let order;

    try {
      order = await orderRepository.create({
        orderNumber: orderNumberService.create(currentDate),
        quoteId: quote.quoteId,
        customerType: "account",
        userId: input.userId,
        contact: {
          fullName: input.body.contact.fullName,
          email: input.body.contact.email,
          phone: input.body.contact.phone,
        },
        shippingAddress: buildShippingAddress(input.body.shippingAddress),
        items: buildOrderItems(quote.items),
        currency: quote.currency,
        subtotalCents: quote.subtotalCents,
        shippingCents: quote.shippingCents,
        totalCents: quote.totalCents,
        status: "pending",
        paymentStatus: "pending",
        fulfillmentStatus: "pending",
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        const existingOrder = await orderRepository.findByQuoteIdForUser(
          quote.quoteId,
          input.userId,
        );

        if (existingOrder) {
          await idempotencyService.complete(
            claim.recordId,
            existingOrder._id,
            currentDate,
          );

          return {
            order: mapOrderToDto(existingOrder),
            responseStatusCode: 201,
            replayed: true,
          };
        }
      }

      await failUnexpectedClaim(claim.recordId, currentDate);

      throw error;
    }

    const consumedQuote = await checkoutQuoteRepository.markConsumedForAccount(
      quote.quoteId,
      input.userId,
      currentDate,
    );

    if (!consumedQuote) {
      await failUnexpectedClaim(claim.recordId, currentDate);

      throw new Error(
        "The quote could not be consumed after creating the order.",
      );
    }

    await idempotencyService.complete(claim.recordId, order._id, currentDate);

    return {
      order: mapOrderToDto(order),
      responseStatusCode: 201,
      replayed: false,
    };
  },

  async listForAccount(userId: Types.ObjectId): Promise<OrderDto[]> {
    const orders = await orderRepository.findByUserId(userId);

    return orders.map((order) => mapOrderToDto(order));
  },

  async findForAccount(
    orderNumber: string,
    userId: Types.ObjectId,
  ): Promise<OrderDto> {
    const order = await orderRepository.findByOrderNumberForUser(
      orderNumber,
      userId,
    );

    if (!order) {
      throw new OrderServiceError(
        "ORDER_NOT_FOUND",
        "El pedido no existe o no pertenece a tu cuenta.",
      );
    }

    return mapOrderToDto(order);
  },
};

export type { IdempotencyErrorCode };
