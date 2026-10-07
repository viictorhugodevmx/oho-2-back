import type { Types } from "mongoose";

import type { CheckoutQuoteItem } from "../../checkout/models/checkout-quote.model.js";
import { checkoutQuoteRepository } from "../../checkout/repositories/checkout-quote.repository.js";
import type { OrderDto } from "../dtos/order.dto.js";
import { mapOrderToDto } from "../mappers/order.mapper.js";
import type { OrderAddress, OrderItem } from "../models/order.model.js";
import { guestOrderAccessRepository } from "../repositories/guest-order-access.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import type { CreateOrderBody } from "../schemas/order.schemas.js";
import { guestOrderTokenService } from "./guest-order-token.service.js";
import { idempotencyService } from "./idempotency.service.js";
import { OrderServiceError } from "./order.service.js";
import { orderNumberService } from "./order-number.service.js";

interface CreateGuestOrderInput {
  guestSessionHash: string;
  idempotencyKey: string;
  body: CreateOrderBody;
}

export interface CreateGuestOrderResult {
  order: OrderDto;
  guestAccessToken: string;
  accessExpiresAt: string;
  responseStatusCode: number;
  replayed: boolean;
}

interface GuestAccessResult {
  token: string;
  expiresAt: Date;
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

async function ensureGuestAccess(
  orderId: Types.ObjectId,
  currentDate: Date,
): Promise<GuestAccessResult> {
  const token = guestOrderTokenService.createToken(orderId.toString());

  const existingAccess =
    await guestOrderAccessRepository.findByOrderId(orderId);

  if (existingAccess) {
    return {
      token,
      expiresAt: existingAccess.expiresAt,
    };
  }

  const expiresAt = guestOrderTokenService.getExpirationDate(currentDate);

  try {
    const access = await guestOrderAccessRepository.create({
      orderId,
      tokenHash: guestOrderTokenService.hashToken(token),
      expiresAt,
    });

    return {
      token,
      expiresAt: access.expiresAt,
    };
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  const concurrentAccess =
    await guestOrderAccessRepository.findByOrderId(orderId);

  if (!concurrentAccess) {
    throw new Error("The guest order access could not be recovered.");
  }

  return {
    token,
    expiresAt: concurrentAccess.expiresAt,
  };
}

async function rejectClaim(
  recordId: Types.ObjectId,
  code: "QUOTE_NOT_FOUND" | "QUOTE_EXPIRED" | "QUOTE_ALREADY_CONSUMED",
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

export const guestOrderService = {
  async create(
    input: CreateGuestOrderInput,
    currentDate = new Date(),
  ): Promise<CreateGuestOrderResult> {
    const claim = await idempotencyService.claimForGuest(
      {
        guestSessionHash: input.guestSessionHash,
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

      const access = await ensureGuestAccess(existingOrder._id, currentDate);

      return {
        order: mapOrderToDto(existingOrder),
        guestAccessToken: access.token,
        accessExpiresAt: access.expiresAt.toISOString(),
        responseStatusCode: claim.responseStatusCode,
        replayed: true,
      };
    }

    const quote = await checkoutQuoteRepository.findForGuest(
      input.body.quoteId,
      input.guestSessionHash,
    );

    if (!quote) {
      return rejectClaim(
        claim.recordId,
        "QUOTE_NOT_FOUND",
        "La cotización no existe o no pertenece a esta sesión invitada.",
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
        customerType: "guest",
        userId: null,
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
        const existingOrder = await orderRepository.findByQuoteId(
          input.body.quoteId,
        );

        if (existingOrder && existingOrder.customerType === "guest") {
          const access = await ensureGuestAccess(
            existingOrder._id,
            currentDate,
          );

          await idempotencyService.complete(
            claim.recordId,
            existingOrder._id,
            currentDate,
          );

          return {
            order: mapOrderToDto(existingOrder),
            guestAccessToken: access.token,
            accessExpiresAt: access.expiresAt.toISOString(),
            responseStatusCode: 201,
            replayed: true,
          };
        }
      }

      await failUnexpectedClaim(claim.recordId, currentDate);
      throw error;
    }

    let access: GuestAccessResult;

    try {
      access = await ensureGuestAccess(order._id, currentDate);
    } catch (error) {
      await failUnexpectedClaim(claim.recordId, currentDate);
      throw error;
    }

    const consumedQuote = await checkoutQuoteRepository.markConsumedForGuest(
      quote.quoteId,
      input.guestSessionHash,
      currentDate,
    );

    if (!consumedQuote) {
      await failUnexpectedClaim(claim.recordId, currentDate);

      throw new Error(
        "The guest quote could not be consumed after creating the order.",
      );
    }

    await idempotencyService.complete(claim.recordId, order._id, currentDate);

    return {
      order: mapOrderToDto(order),
      guestAccessToken: access.token,
      accessExpiresAt: access.expiresAt.toISOString(),
      responseStatusCode: 201,
      replayed: false,
    };
  },
};
