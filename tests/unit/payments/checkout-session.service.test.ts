import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderModel } from "../../../src/modules/orders/models/order.model.js";
import { guestOrderAccessRepository } from "../../../src/modules/orders/repositories/guest-order-access.repository.js";
import { orderRepository } from "../../../src/modules/orders/repositories/order.repository.js";
import { guestOrderTokenService } from "../../../src/modules/orders/services/guest-order-token.service.js";
import { paymentAttemptRepository } from "../../../src/modules/payments/repositories/payment-attempt.repository.js";
import {
  checkoutSessionService,
  type CheckoutSessionError,
} from "../../../src/modules/payments/services/checkout-session.service.js";
import { paymentProvider } from "../../../src/providers/payment/stripe-payment.provider.js";

const USER_ID = "507f1f77bcf86cd799439011";

const CURRENT_DATE = new Date("2026-10-07T20:00:00.000Z");

const EXPIRES_AT = new Date("2026-10-07T20:30:00.000Z");

const GUEST_TOKEN = "A".repeat(43);

function createOrder(overrides: Record<string, unknown> = {}) {
  return new OrderModel({
    orderNumber: "OHO-20261007-A1B2C3D4",
    quoteId: "d831aa77-9303-42f6-b9d7-b61b90d59b3f",
    customerType: "account",
    userId: new Types.ObjectId(USER_ID),
    contact: {
      fullName: "Cliente OHO",
      email: "cliente@example.com",
      phone: "+52 961 123 4567",
    },
    shippingAddress: {
      addressLine1: "Avenida Central 123",
      city: "Tuxtla Gutiérrez",
      state: "Chiapas",
      postalCode: "29000",
      country: "México",
    },
    items: [
      {
        productId: new Types.ObjectId(),
        productExternalId: "product-002",
        productSlug: "hoodie-after-hours",
        productName: "Hoodie After Hours",
        productImageUrl: "https://example.com/product.jpg",
        designId: new Types.ObjectId(),
        designExternalId: "design-002",
        designSlug: "front-row-pressure",
        designTitle: "Front Row Pressure",
        designImageUrl: "https://example.com/design.jpg",
        format: "standard",
        formatLabel: "Estándar",
        formatPriceAdjustmentCents: 0,
        selectedOptions: [
          {
            optionId: "size",
            optionName: "Talla",
            valueId: "size-m",
            valueLabel: "M",
            value: "m",
            priceModifierCents: 0,
          },
        ],
        quantity: 1,
        basePriceCents: 84_900,
        unitPriceCents: 84_900,
        lineTotalCents: 84_900,
      },
    ],
    currency: "MXN",
    subtotalCents: 84_900,
    shippingCents: 14_900,
    totalCents: 99_800,
    status: "pending",
    paymentStatus: "pending",
    paymentProvider: null,
    paidAt: null,
    fulfillmentStatus: "not_requested",
    fulfillmentProvider: null,
    fulfillmentReference: null,
    fulfillmentSubmittedAt: null,
    ...overrides,
  });
}

function mockNewSession() {
  vi.spyOn(paymentAttemptRepository, "findActiveByOrderId").mockResolvedValue(
    null,
  );

  vi.spyOn(paymentProvider, "createCheckoutSession").mockResolvedValue({
    checkoutSessionId: "cs_test_checkout_001",
    checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_checkout_001",
    expiresAt: EXPIRES_AT,
  });

  return vi
    .spyOn(paymentAttemptRepository, "create")
    .mockResolvedValue({} as never);
}

describe("checkoutSessionService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("crea Checkout desde el pedido de la cuenta", async () => {
    const order = createOrder();

    vi.spyOn(orderRepository, "findByOrderNumberForUser").mockResolvedValue(
      order,
    );

    const createAttempt = mockNewSession();

    const result = await checkoutSessionService.createForAccount(
      order.orderNumber,
      USER_ID,
      CURRENT_DATE,
    );

    expect(result.reused).toBe(false);

    expect(paymentProvider.createCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerEmail: "cliente@example.com",
        shippingCents: 14_900,
        items: [
          expect.objectContaining({
            name: "Hoodie After Hours",
            unitAmountCents: 84_900,
            quantity: 1,
          }),
        ],
      }),
      expect.stringContaining(`checkout:${order._id.toString()}:`),
    );

    expect(createAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: order._id,
        amountTotalCents: 99_800,
        status: "open",
      }),
    );
  });

  it("reutiliza una sesión abierta y vigente", async () => {
    const order = createOrder();

    vi.spyOn(orderRepository, "findByOrderNumberForUser").mockResolvedValue(
      order,
    );

    vi.spyOn(paymentAttemptRepository, "findActiveByOrderId").mockResolvedValue(
      {
        checkoutSessionId: "cs_test_existing_001",
        checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_existing_001",
        expiresAt: EXPIRES_AT,
      } as never,
    );

    const createSession = vi.spyOn(paymentProvider, "createCheckoutSession");

    const result = await checkoutSessionService.createForAccount(
      order.orderNumber,
      USER_ID,
      CURRENT_DATE,
    );

    expect(result.reused).toBe(true);
    expect(result.session.checkoutSessionId).toBe("cs_test_existing_001");
    expect(createSession).not.toHaveBeenCalled();
  });

  it("autoriza el pedido invitado mediante el hash del token", async () => {
    const order = createOrder({
      customerType: "guest",
      userId: null,
    });

    vi.spyOn(orderRepository, "findByOrderNumberForGuest").mockResolvedValue(
      order,
    );

    vi.spyOn(guestOrderTokenService, "hashToken").mockReturnValue(
      "b".repeat(64),
    );

    const recordAccess = vi
      .spyOn(guestOrderAccessRepository, "recordActiveAccess")
      .mockResolvedValue({} as never);

    mockNewSession();

    await checkoutSessionService.createForGuest(
      order.orderNumber,
      GUEST_TOKEN,
      CURRENT_DATE,
    );

    expect(recordAccess).toHaveBeenCalledWith(
      order._id,
      "b".repeat(64),
      CURRENT_DATE,
    );
  });

  it("oculta pedidos ajenos o inexistentes", async () => {
    vi.spyOn(orderRepository, "findByOrderNumberForUser").mockResolvedValue(
      null,
    );

    await expect(
      checkoutSessionService.createForAccount(
        "OHO-20261007-NOTFOUND",
        USER_ID,
        CURRENT_DATE,
      ),
    ).rejects.toMatchObject({
      code: "PAYMENT_ORDER_NOT_FOUND",
    } satisfies Partial<CheckoutSessionError>);
  });

  it("rechaza un pedido ya pagado", async () => {
    const order = createOrder({
      paymentStatus: "paid",
    });

    vi.spyOn(orderRepository, "findByOrderNumberForUser").mockResolvedValue(
      order,
    );

    await expect(
      checkoutSessionService.createForAccount(
        order.orderNumber,
        USER_ID,
        CURRENT_DATE,
      ),
    ).rejects.toMatchObject({
      code: "ORDER_ALREADY_PAID",
    } satisfies Partial<CheckoutSessionError>);
  });

  it("rechaza un pedido cancelado", async () => {
    const order = createOrder({
      status: "cancelled",
    });

    vi.spyOn(orderRepository, "findByOrderNumberForUser").mockResolvedValue(
      order,
    );

    await expect(
      checkoutSessionService.createForAccount(
        order.orderNumber,
        USER_ID,
        CURRENT_DATE,
      ),
    ).rejects.toMatchObject({
      code: "ORDER_NOT_PAYABLE",
    } satisfies Partial<CheckoutSessionError>);
  });

  it("oculta un pedido invitado sin acceso válido", async () => {
    const order = createOrder({
      customerType: "guest",
      userId: null,
    });

    vi.spyOn(orderRepository, "findByOrderNumberForGuest").mockResolvedValue(
      order,
    );

    vi.spyOn(
      guestOrderAccessRepository,
      "recordActiveAccess",
    ).mockResolvedValue(null);

    await expect(
      checkoutSessionService.createForGuest(
        order.orderNumber,
        GUEST_TOKEN,
        CURRENT_DATE,
      ),
    ).rejects.toMatchObject({
      code: "PAYMENT_ORDER_NOT_FOUND",
    } satisfies Partial<CheckoutSessionError>);
  });
});
