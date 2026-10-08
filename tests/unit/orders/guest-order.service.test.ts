import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutQuoteModel } from "../../../src/modules/checkout/models/checkout-quote.model.js";
import { checkoutQuoteRepository } from "../../../src/modules/checkout/repositories/checkout-quote.repository.js";
import { OrderModel } from "../../../src/modules/orders/models/order.model.js";
import { guestOrderAccessRepository } from "../../../src/modules/orders/repositories/guest-order-access.repository.js";
import { orderRepository } from "../../../src/modules/orders/repositories/order.repository.js";
import type { CreateOrderBody } from "../../../src/modules/orders/schemas/order.schemas.js";
import { guestOrderService } from "../../../src/modules/orders/services/guest-order.service.js";
import { guestOrderTokenService } from "../../../src/modules/orders/services/guest-order-token.service.js";
import { idempotencyService } from "../../../src/modules/orders/services/idempotency.service.js";

const CURRENT_DATE = new Date("2026-10-07T18:00:00.000Z");
const ACCESS_EXPIRATION = new Date("2026-11-06T18:00:00.000Z");
const GUEST_SESSION_HASH = "a".repeat(64);

const body: CreateOrderBody = {
  quoteId: "d831aa77-9303-42f6-b9d7-b61b90d59b3f",
  contact: {
    fullName: "Cliente Invitado",
    email: "invitado@example.com",
    phone: "+52 961 123 4567",
  },
  shippingAddress: {
    addressLine1: "Avenida Central 123",
    addressLine2: "Departamento 4",
    neighborhood: "Centro",
    city: "Tuxtla Gutiérrez",
    state: "Chiapas",
    postalCode: "29000",
    country: "México",
    references: "Portón negro",
  },
};

function createQuote(overrides: Record<string, unknown> = {}) {
  return new CheckoutQuoteModel({
    quoteId: body.quoteId,
    customerType: "guest",
    userId: null,
    guestSessionHash: GUEST_SESSION_HASH,
    currency: "MXN",
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
    subtotalCents: 84_900,
    shippingCents: 14_900,
    totalCents: 99_800,
    expiresAt: new Date("2026-10-07T18:15:00.000Z"),
    consumedAt: null,
    ...overrides,
  });
}

function createOrder() {
  return new OrderModel({
    orderNumber: "OHO-20261007-A1B2C3D4",
    quoteId: body.quoteId,
    customerType: "guest",
    userId: null,
    contact: body.contact,
    shippingAddress: body.shippingAddress,
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
    fulfillmentStatus: "not_requested",
    createdAt: CURRENT_DATE,
    updatedAt: CURRENT_DATE,
  });
}

function mockAcquiredClaim(): void {
  vi.spyOn(idempotencyService, "claimForGuest").mockResolvedValue({
    status: "acquired",
    recordId: new Types.ObjectId(),
  });
}

function mockSuccessfulPersistence() {
  const quote = createQuote();
  const order = createOrder();

  vi.spyOn(checkoutQuoteRepository, "findForGuest").mockResolvedValue(quote);

  vi.spyOn(orderRepository, "create").mockResolvedValue(order);

  vi.spyOn(guestOrderAccessRepository, "findByOrderId").mockResolvedValue(null);

  const createAccess = vi
    .spyOn(guestOrderAccessRepository, "create")
    .mockResolvedValue({
      expiresAt: ACCESS_EXPIRATION,
    } as never);

  vi.spyOn(checkoutQuoteRepository, "markConsumedForGuest").mockResolvedValue(
    quote,
  );

  vi.spyOn(idempotencyService, "complete").mockResolvedValue(null);

  return {
    order,
    createAccess,
  };
}

describe("guestOrderService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("crea un pedido invitado desde el snapshot de la cotización", async () => {
    mockAcquiredClaim();

    const { order, createAccess } = mockSuccessfulPersistence();

    const result = await guestOrderService.create(
      {
        guestSessionHash: GUEST_SESSION_HASH,
        idempotencyKey: "checkout-guest-001",
        body,
      },
      CURRENT_DATE,
    );

    expect(result.order.id).toBe(order._id.toString());
    expect(result.order.customerType).toBe("guest");
    expect(result.order.totalCents).toBe(99_800);
    expect(result.responseStatusCode).toBe(201);
    expect(result.replayed).toBe(false);

    expect(result.guestAccessToken).toHaveLength(43);
    expect(guestOrderTokenService.isValidToken(result.guestAccessToken)).toBe(
      true,
    );

    expect(result.accessExpiresAt).toBe(ACCESS_EXPIRATION.toISOString());

    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteId: body.quoteId,
        customerType: "guest",
        userId: null,
        subtotalCents: 84_900,
        shippingCents: 14_900,
        totalCents: 99_800,
      }),
    );

    const accessRecord = createAccess.mock.calls[0]?.[0];

    expect(accessRecord?.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    expect(accessRecord?.tokenHash).not.toBe(result.guestAccessToken);

    expect(checkoutQuoteRepository.markConsumedForGuest).toHaveBeenCalledWith(
      body.quoteId,
      GUEST_SESSION_HASH,
      CURRENT_DATE,
    );
  });

  it("recupera el mismo token durante una repetición idempotente", async () => {
    const order = createOrder();

    vi.spyOn(idempotencyService, "claimForGuest").mockResolvedValue({
      status: "replay",
      orderId: order._id,
      responseStatusCode: 201,
    });

    vi.spyOn(orderRepository, "findById").mockResolvedValue(order);

    vi.spyOn(guestOrderAccessRepository, "findByOrderId").mockResolvedValue({
      expiresAt: ACCESS_EXPIRATION,
    } as never);

    const findForGuest = vi
      .spyOn(checkoutQuoteRepository, "findForGuest")
      .mockResolvedValue(null);

    const createOrderSpy = vi
      .spyOn(orderRepository, "create")
      .mockRejectedValue(
        new Error("Order creation must not run during replay."),
      );

    const firstResult = await guestOrderService.create(
      {
        guestSessionHash: GUEST_SESSION_HASH,
        idempotencyKey: "checkout-guest-001",
        body,
      },
      CURRENT_DATE,
    );

    const expectedToken = guestOrderTokenService.createToken(
      order._id.toString(),
    );

    expect(firstResult.guestAccessToken).toBe(expectedToken);

    expect(firstResult.replayed).toBe(true);
    expect(firstResult.order.id).toBe(order._id.toString());

    expect(findForGuest).not.toHaveBeenCalled();
    expect(createOrderSpy).not.toHaveBeenCalled();
  });

  it("rechaza una cotización ajena o inexistente", async () => {
    mockAcquiredClaim();

    vi.spyOn(checkoutQuoteRepository, "findForGuest").mockResolvedValue(null);

    const fail = vi.spyOn(idempotencyService, "fail").mockResolvedValue(null);

    await expect(
      guestOrderService.create(
        {
          guestSessionHash: GUEST_SESSION_HASH,
          idempotencyKey: "checkout-guest-001",
          body,
        },
        CURRENT_DATE,
      ),
    ).rejects.toMatchObject({
      code: "QUOTE_NOT_FOUND",
    });

    expect(fail).toHaveBeenCalledWith(
      expect.any(Types.ObjectId),
      "QUOTE_NOT_FOUND",
      CURRENT_DATE,
    );
  });

  it("rechaza una cotización expirada", async () => {
    mockAcquiredClaim();

    vi.spyOn(checkoutQuoteRepository, "findForGuest").mockResolvedValue(
      createQuote({
        expiresAt: new Date("2026-10-07T17:59:59.000Z"),
      }),
    );

    vi.spyOn(idempotencyService, "fail").mockResolvedValue(null);

    await expect(
      guestOrderService.create(
        {
          guestSessionHash: GUEST_SESSION_HASH,
          idempotencyKey: "checkout-guest-001",
          body,
        },
        CURRENT_DATE,
      ),
    ).rejects.toMatchObject({
      code: "QUOTE_EXPIRED",
    });
  });

  it("rechaza una cotización ya consumida", async () => {
    mockAcquiredClaim();

    vi.spyOn(checkoutQuoteRepository, "findForGuest").mockResolvedValue(
      createQuote({
        consumedAt: new Date("2026-10-07T17:55:00.000Z"),
      }),
    );

    vi.spyOn(idempotencyService, "fail").mockResolvedValue(null);

    await expect(
      guestOrderService.create(
        {
          guestSessionHash: GUEST_SESSION_HASH,
          idempotencyKey: "checkout-guest-001",
          body,
        },
        CURRENT_DATE,
      ),
    ).rejects.toMatchObject({
      code: "QUOTE_ALREADY_CONSUMED",
    });
  });
});
