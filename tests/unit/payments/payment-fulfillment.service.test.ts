import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OrderModel } from "../../../src/modules/orders/models/order.model.js";
import { orderRepository } from "../../../src/modules/orders/repositories/order.repository.js";
import {
  PaymentFulfillmentError,
  paymentFulfillmentService,
} from "../../../src/modules/payments/services/payment-fulfillment.service.js";
import { printProvider } from "../../../src/providers/print/simulated-print.provider.js";

const CURRENT_DATE = new Date("2026-10-07T21:00:00.000Z");

function createOrder(overrides: Record<string, unknown> = {}) {
  return new OrderModel({
    orderNumber: "OHO-20261007-A1B2C3D4",
    quoteId: "d831aa77-9303-42f6-b9d7-b61b90d59b3f",
    customerType: "account",
    userId: new Types.ObjectId(),
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
        selectedOptions: [],
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

function mockSubmission() {
  return vi.spyOn(printProvider, "submitOrder").mockResolvedValue({
    provider: "simulated",
    reference: "SIM-OHO-20261007-A1B2C3D4",
    status: "submitted",
    submittedAt: CURRENT_DATE,
  });
}

describe("paymentFulfillmentService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("confirma el pago y envía el pedido a impresión", async () => {
    const pendingOrder = createOrder();

    const paidOrder = createOrder({
      _id: pendingOrder._id,
      status: "confirmed",
      paymentStatus: "paid",
      paymentProvider: "stripe",
      paidAt: CURRENT_DATE,
    });

    vi.spyOn(orderRepository, "findById").mockResolvedValue(pendingOrder);

    const markPaid = vi
      .spyOn(orderRepository, "markPaidAndConfirmed")
      .mockResolvedValue(paidOrder);

    const submitOrder = mockSubmission();

    const markSubmitted = vi
      .spyOn(orderRepository, "markFulfillmentSubmitted")
      .mockResolvedValue(
        createOrder({
          status: "confirmed",
          paymentStatus: "paid",
          fulfillmentStatus: "submitted",
        }),
      );

    await paymentFulfillmentService.completePaidOrder(
      pendingOrder._id,
      CURRENT_DATE,
    );

    expect(markPaid).toHaveBeenCalledWith(pendingOrder._id, CURRENT_DATE);

    expect(submitOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: pendingOrder._id.toString(),
        orderNumber: pendingOrder.orderNumber,
        submittedAt: CURRENT_DATE,
      }),
    );

    expect(markSubmitted).toHaveBeenCalledWith(
      pendingOrder._id,
      "SIM-OHO-20261007-A1B2C3D4",
      CURRENT_DATE,
    );
  });

  it("continúa la impresión si el pago ya estaba aplicado", async () => {
    const paidOrder = createOrder({
      status: "confirmed",
      paymentStatus: "paid",
      paymentProvider: "stripe",
      paidAt: CURRENT_DATE,
    });

    vi.spyOn(orderRepository, "findById").mockResolvedValue(paidOrder);

    const markPaid = vi.spyOn(orderRepository, "markPaidAndConfirmed");

    const submitOrder = mockSubmission();

    vi.spyOn(orderRepository, "markFulfillmentSubmitted").mockResolvedValue(
      paidOrder,
    );

    await paymentFulfillmentService.completePaidOrder(
      paidOrder._id,
      CURRENT_DATE,
    );

    expect(markPaid).not.toHaveBeenCalled();
    expect(submitOrder).toHaveBeenCalledOnce();
  });

  it("no repite una impresión ya registrada", async () => {
    const submittedOrder = createOrder({
      status: "confirmed",
      paymentStatus: "paid",
      paymentProvider: "stripe",
      paidAt: CURRENT_DATE,
      fulfillmentStatus: "submitted",
      fulfillmentProvider: "simulated",
      fulfillmentReference: "SIM-OHO-20261007-A1B2C3D4",
      fulfillmentSubmittedAt: CURRENT_DATE,
    });

    vi.spyOn(orderRepository, "findById").mockResolvedValue(submittedOrder);

    const submitOrder = vi.spyOn(printProvider, "submitOrder");

    await paymentFulfillmentService.completePaidOrder(
      submittedOrder._id,
      CURRENT_DATE,
    );

    expect(submitOrder).not.toHaveBeenCalled();
  });

  it("rechaza un pedido inexistente", async () => {
    vi.spyOn(orderRepository, "findById").mockResolvedValue(null);

    await expect(
      paymentFulfillmentService.completePaidOrder(
        new Types.ObjectId(),
        CURRENT_DATE,
      ),
    ).rejects.toBeInstanceOf(PaymentFulfillmentError);
  });

  it("propaga el error de impresión para permitir el reintento", async () => {
    const paidOrder = createOrder({
      status: "confirmed",
      paymentStatus: "paid",
    });

    vi.spyOn(orderRepository, "findById").mockResolvedValue(paidOrder);

    vi.spyOn(printProvider, "submitOrder").mockRejectedValue(
      new Error("Simulated print provider unavailable."),
    );

    await expect(
      paymentFulfillmentService.completePaidOrder(paidOrder._id, CURRENT_DATE),
    ).rejects.toThrow("Simulated print provider unavailable.");
  });
});
