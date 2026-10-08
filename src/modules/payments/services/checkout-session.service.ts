import { Types } from "mongoose";

import { env } from "../../../config/env.js";
import type { Order } from "../../orders/models/order.model.js";
import { guestOrderAccessRepository } from "../../orders/repositories/guest-order-access.repository.js";
import { orderRepository } from "../../orders/repositories/order.repository.js";
import { guestOrderTokenService } from "../../orders/services/guest-order-token.service.js";
import { paymentProvider } from "../../../providers/payment/stripe-payment.provider.js";
import type { PaymentLineItem } from "../../../providers/payment/payment-provider.js";
import { paymentAttemptRepository } from "../repositories/payment-attempt.repository.js";

export type CheckoutSessionErrorCode =
  "PAYMENT_ORDER_NOT_FOUND" | "ORDER_ALREADY_PAID" | "ORDER_NOT_PAYABLE";

export class CheckoutSessionError extends Error {
  constructor(
    public readonly code: CheckoutSessionErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "CheckoutSessionError";
  }
}

export interface CheckoutSessionDto {
  checkoutSessionId: string;
  checkoutUrl: string;
  expiresAt: string;
}

export interface CheckoutSessionServiceResult {
  session: CheckoutSessionDto;
  reused: boolean;
}

type OrderRecord = Order & {
  _id: Types.ObjectId;
};

function buildItemDescription(item: Order["items"][number]): string {
  const details = [
    item.designTitle,
    item.formatLabel,
    ...item.selectedOptions.map(
      (option) => `${option.optionName}: ${option.valueLabel}`,
    ),
  ];

  return details.join(" · ");
}

function buildLineItems(order: OrderRecord): PaymentLineItem[] {
  return order.items.map((item) => ({
    name: item.productName,
    description: buildItemDescription(item),
    imageUrl: item.productImageUrl,
    unitAmountCents: item.unitPriceCents,
    quantity: item.quantity,
  }));
}

function assertOrderIsPayable(order: OrderRecord): void {
  if (order.paymentStatus === "paid") {
    throw new CheckoutSessionError(
      "ORDER_ALREADY_PAID",
      "El pedido ya fue pagado.",
    );
  }

  if (order.status === "cancelled") {
    throw new CheckoutSessionError(
      "ORDER_NOT_PAYABLE",
      "El pedido cancelado no puede pagarse.",
    );
  }
}

function createSessionUrls(orderNumber: string) {
  const frontendUrl = env.FRONTEND_URL.replace(/\/$/, "");

  return {
    successUrl:
      `${frontendUrl}/checkout/success` + "?session_id={CHECKOUT_SESSION_ID}",
    cancelUrl:
      `${frontendUrl}/checkout` +
      `?payment=cancelled&order=${encodeURIComponent(orderNumber)}`,
  };
}

function getSessionExpiration(currentDate: Date): Date {
  return new Date(
    currentDate.getTime() +
      env.STRIPE_CHECKOUT_SESSION_TTL_MINUTES * 60 * 1_000,
  );
}

function createStripeIdempotencyKey(
  orderId: string,
  currentDate: Date,
): string {
  const ttlMilliseconds = env.STRIPE_CHECKOUT_SESSION_TTL_MINUTES * 60 * 1_000;

  const timeBucket = Math.floor(currentDate.getTime() / ttlMilliseconds);

  return `checkout:${orderId}:${timeBucket}`;
}

function mapStoredSession(attempt: {
  checkoutSessionId: string;
  checkoutUrl: string;
  expiresAt: Date;
}): CheckoutSessionDto {
  return {
    checkoutSessionId: attempt.checkoutSessionId,
    checkoutUrl: attempt.checkoutUrl,
    expiresAt: attempt.expiresAt.toISOString(),
  };
}

async function createForOrder(
  order: OrderRecord,
  currentDate: Date,
): Promise<CheckoutSessionServiceResult> {
  assertOrderIsPayable(order);

  const activeAttempt = await paymentAttemptRepository.findActiveByOrderId(
    order._id,
    currentDate,
  );

  if (activeAttempt) {
    return {
      session: mapStoredSession(activeAttempt),
      reused: true,
    };
  }

  const expiresAt = getSessionExpiration(currentDate);

  const urls = createSessionUrls(order.orderNumber);

  const providerSession = await paymentProvider.createCheckoutSession(
    {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      customerEmail: order.contact.email,
      currency: "mxn",
      items: buildLineItems(order),
      shippingCents: order.shippingCents,
      successUrl: urls.successUrl,
      cancelUrl: urls.cancelUrl,
      expiresAt,
    },
    createStripeIdempotencyKey(order._id.toString(), currentDate),
  );

  await paymentAttemptRepository.create({
    orderId: order._id,
    provider: "stripe",
    checkoutSessionId: providerSession.checkoutSessionId,
    checkoutUrl: providerSession.checkoutUrl,
    currency: "MXN",
    amountTotalCents: order.totalCents,
    status: "open",
    expiresAt: providerSession.expiresAt,
    paymentIntentId: null,
    completedAt: null,
    failedAt: null,
  });

  return {
    session: {
      checkoutSessionId: providerSession.checkoutSessionId,
      checkoutUrl: providerSession.checkoutUrl,
      expiresAt: providerSession.expiresAt.toISOString(),
    },
    reused: false,
  };
}

function sendNotFound(): never {
  throw new CheckoutSessionError(
    "PAYMENT_ORDER_NOT_FOUND",
    "El pedido no existe o no tienes acceso.",
  );
}

export const checkoutSessionService = {
  async createForAccount(
    orderNumber: string,
    userId: string,
    currentDate = new Date(),
  ): Promise<CheckoutSessionServiceResult> {
    if (!Types.ObjectId.isValid(userId)) {
      return sendNotFound();
    }

    const order = await orderRepository.findByOrderNumberForUser(
      orderNumber,
      new Types.ObjectId(userId),
    );

    if (!order) {
      return sendNotFound();
    }

    return createForOrder(order, currentDate);
  },

  async createForGuest(
    orderNumber: string,
    guestAccessToken: string,
    currentDate = new Date(),
  ): Promise<CheckoutSessionServiceResult> {
    const order = await orderRepository.findByOrderNumberForGuest(orderNumber);

    if (!order) {
      return sendNotFound();
    }

    const tokenHash = guestOrderTokenService.hashToken(guestAccessToken);

    const access = await guestOrderAccessRepository.recordActiveAccess(
      order._id,
      tokenHash,
      currentDate,
    );

    if (!access) {
      return sendNotFound();
    }

    return createForOrder(order, currentDate);
  },
};
