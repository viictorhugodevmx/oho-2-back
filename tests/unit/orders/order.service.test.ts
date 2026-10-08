import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { checkoutQuoteRepository } from "../../../src/modules/checkout/repositories/checkout-quote.repository.js";
import { orderRepository } from "../../../src/modules/orders/repositories/order.repository.js";
import type { CreateOrderBody } from "../../../src/modules/orders/schemas/order.schemas.js";
import { idempotencyService } from "../../../src/modules/orders/services/idempotency.service.js";
import { orderNumberService } from "../../../src/modules/orders/services/order-number.service.js";
import { orderService } from "../../../src/modules/orders/services/order.service.js";

vi.mock(
  "../../../src/modules/checkout/repositories/checkout-quote.repository.js",
  () => ({
    checkoutQuoteRepository: {
      findForAccount: vi.fn(),
      markConsumedForAccount: vi.fn(),
    },
  }),
);

vi.mock("../../../src/modules/orders/repositories/order.repository.js", () => ({
  orderRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByQuoteIdForUser: vi.fn(),
    findByOrderNumberForUser: vi.fn(),
    findByUserId: vi.fn(),
  },
}));

vi.mock("../../../src/modules/orders/services/idempotency.service.js", () => ({
  idempotencyService: {
    claimForAccount: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
  },
}));

vi.mock("../../../src/modules/orders/services/order-number.service.js", () => ({
  orderNumberService: {
    create: vi.fn(),
  },
}));

const currentDate = new Date("2026-10-07T18:00:00.000Z");
const userId = new Types.ObjectId();
const recordId = new Types.ObjectId();
const orderId = new Types.ObjectId();

const body: CreateOrderBody = {
  quoteId: "8be2631b-5bed-4fa8-a717-6cc2814075ca",
  contact: {
    fullName: "Víctor Hugo Segundo Aguilar",
    email: "victor@example.com",
    phone: "4433065417",
  },
  shippingAddress: {
    addressLine1: "José María Rojo 160",
    neighborhood: "Moctezuma",
    city: "Morelia",
    state: "Michoacán",
    postalCode: "58030",
    country: "México",
    references: "Portón negro",
  },
};

function createQuote() {
  return {
    quoteId: body.quoteId,
    customerType: "account",
    userId,
    guestSessionHash: null,
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
        basePriceCents: 84900,
        unitPriceCents: 84900,
        lineTotalCents: 84900,
      },
    ],
    subtotalCents: 84900,
    shippingCents: 14900,
    totalCents: 99800,
    expiresAt: new Date("2026-10-07T18:15:00.000Z"),
    consumedAt: null,
  };
}

function createOrder() {
  return {
    _id: orderId,
    orderNumber: "OHO-20261007-ABCDEF12",
    quoteId: body.quoteId,
    customerType: "account",
    userId,
    contact: body.contact,
    shippingAddress: body.shippingAddress,
    items: createQuote().items,
    currency: "MXN",
    subtotalCents: 84900,
    shippingCents: 14900,
    totalCents: 99800,
    status: "pending",
    paymentStatus: "pending",
    fulfillmentStatus: "not_requested",
    createdAt: currentDate,
    updatedAt: currentDate,
  };
}

describe("orderService", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(idempotencyService.claimForAccount).mockResolvedValue({
      status: "acquired",
      recordId,
    });

    vi.mocked(idempotencyService.complete).mockResolvedValue(null as never);

    vi.mocked(idempotencyService.fail).mockResolvedValue(null as never);

    vi.mocked(orderNumberService.create).mockReturnValue(
      "OHO-20261007-ABCDEF12",
    );
  });

  it("crea la orden usando únicamente el snapshot de la cotización", async () => {
    const quote = createQuote();
    const order = createOrder();

    vi.mocked(checkoutQuoteRepository.findForAccount).mockResolvedValue(
      quote as never,
    );

    vi.mocked(orderRepository.create).mockResolvedValue(order as never);

    vi.mocked(checkoutQuoteRepository.markConsumedForAccount).mockResolvedValue(
      {
        ...quote,
        consumedAt: currentDate,
      } as never,
    );

    const result = await orderService.createForAccount(
      {
        userId,
        idempotencyKey: "checkout-1234567890",
        body,
      },
      currentDate,
    );

    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        quoteId: body.quoteId,
        userId,
        subtotalCents: 84900,
        shippingCents: 14900,
        totalCents: 99800,
        items: [
          expect.objectContaining({
            productExternalId: "product-002",
            designExternalId: "design-002",
            unitPriceCents: 84900,
            selectedOptions: [
              expect.objectContaining({
                optionId: "size",
                valueId: "size-m",
              }),
            ],
          }),
        ],
      }),
    );

    expect(checkoutQuoteRepository.markConsumedForAccount).toHaveBeenCalledWith(
      body.quoteId,
      userId,
      currentDate,
    );

    expect(idempotencyService.complete).toHaveBeenCalledWith(
      recordId,
      orderId,
      currentDate,
    );

    expect(result).toMatchObject({
      responseStatusCode: 201,
      replayed: false,
      order: {
        orderNumber: "OHO-20261007-ABCDEF12",
        totalCents: 99800,
      },
    });
  });

  it("recupera una orden completada mediante idempotencia", async () => {
    const order = createOrder();

    vi.mocked(idempotencyService.claimForAccount).mockResolvedValue({
      status: "replay",
      orderId,
      responseStatusCode: 201,
    });

    vi.mocked(orderRepository.findById).mockResolvedValue(order as never);

    const result = await orderService.createForAccount({
      userId,
      idempotencyKey: "checkout-1234567890",
      body,
    });

    expect(result.replayed).toBe(true);
    expect(result.order.id).toBe(orderId.toString());
    expect(checkoutQuoteRepository.findForAccount).not.toHaveBeenCalled();
    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it("rechaza una cotización ajena o inexistente", async () => {
    vi.mocked(checkoutQuoteRepository.findForAccount).mockResolvedValue(null);

    await expect(
      orderService.createForAccount(
        {
          userId,
          idempotencyKey: "checkout-1234567890",
          body,
        },
        currentDate,
      ),
    ).rejects.toMatchObject({
      code: "QUOTE_NOT_FOUND",
    });

    expect(idempotencyService.fail).toHaveBeenCalledWith(
      recordId,
      "QUOTE_NOT_FOUND",
      currentDate,
    );
  });

  it("rechaza una cotización expirada", async () => {
    vi.mocked(checkoutQuoteRepository.findForAccount).mockResolvedValue({
      ...createQuote(),
      expiresAt: new Date("2026-10-07T17:59:59.000Z"),
    } as never);

    await expect(
      orderService.createForAccount(
        {
          userId,
          idempotencyKey: "checkout-1234567890",
          body,
        },
        currentDate,
      ),
    ).rejects.toMatchObject({
      code: "QUOTE_EXPIRED",
    });

    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it("rechaza una cotización consumida", async () => {
    vi.mocked(checkoutQuoteRepository.findForAccount).mockResolvedValue({
      ...createQuote(),
      consumedAt: new Date("2026-10-07T17:58:00.000Z"),
    } as never);

    await expect(
      orderService.createForAccount(
        {
          userId,
          idempotencyKey: "checkout-1234567890",
          body,
        },
        currentDate,
      ),
    ).rejects.toMatchObject({
      code: "QUOTE_ALREADY_CONSUMED",
    });

    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it("lista y consulta únicamente pedidos de la cuenta", async () => {
    const order = createOrder();

    vi.mocked(orderRepository.findByUserId).mockResolvedValue([order] as never);

    vi.mocked(orderRepository.findByOrderNumberForUser).mockResolvedValue(
      order as never,
    );

    const list = await orderService.listForAccount(userId);
    const detail = await orderService.findForAccount(order.orderNumber, userId);

    expect(list).toHaveLength(1);
    expect(detail.orderNumber).toBe(order.orderNumber);
    expect(orderRepository.findByUserId).toHaveBeenCalledWith(userId);
    expect(orderRepository.findByOrderNumberForUser).toHaveBeenCalledWith(
      order.orderNumber,
      userId,
    );
  });

  it("oculta los pedidos ajenos como no encontrados", async () => {
    vi.mocked(orderRepository.findByOrderNumberForUser).mockResolvedValue(null);

    await expect(
      orderService.findForAccount("OHO-20261007-UNKNOWN1", userId),
    ).rejects.toMatchObject({
      code: "ORDER_NOT_FOUND",
    });
  });
});
