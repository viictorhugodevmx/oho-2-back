import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import { OrderModel } from "../../../src/modules/orders/models/order.model.js";

function createValidOrder() {
  return new OrderModel({
    orderNumber: "OHO-TEST-0001",
    quoteId: "8be2631b-5bed-4fa8-a717-6cc2814075ca",
    customerType: "account",
    userId: new Types.ObjectId(),
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
    currency: "MXN",
    subtotalCents: 84900,
    shippingCents: 14900,
    totalCents: 99800,
  });
}

describe("OrderModel", () => {
  it("aplica los estados iniciales separados", () => {
    const order = createValidOrder();

    expect(order.status).toBe("pending");
    expect(order.paymentStatus).toBe("pending");
    expect(order.fulfillmentStatus).toBe("not_requested");
    expect(order.paymentProvider).toBeNull();
    expect(order.paidAt).toBeNull();
    expect(order.fulfillmentProvider).toBeNull();
    expect(order.fulfillmentReference).toBeNull();
    expect(order.fulfillmentSubmittedAt).toBeNull();
  });

  it("acepta los estados posteriores al pago y producción", async () => {
    const order = createValidOrder();

    order.status = "confirmed";
    order.paymentStatus = "paid";
    order.paymentProvider = "stripe";
    order.paidAt = new Date("2026-10-07T20:00:00.000Z");
    order.fulfillmentStatus = "submitted";
    order.fulfillmentProvider = "simulated";
    order.fulfillmentReference = "SIM-OHO-TEST-0001";
    order.fulfillmentSubmittedAt = new Date("2026-10-07T20:00:01.000Z");

    await expect(order.validate()).resolves.toBeUndefined();
  });

  it("permite una orden de cuenta con snapshot completo", async () => {
    const order = createValidOrder();

    await expect(order.validate()).resolves.toBeUndefined();

    expect(order.items[0]?.selectedOptions[0]?.valueId).toBe("size-m");
    expect(order.items[0]?.formatLabel).toBe("Estándar");
    expect(order.quoteId).toBe("8be2631b-5bed-4fa8-a717-6cc2814075ca");
  });

  it("requiere usuario cuando la orden pertenece a una cuenta", async () => {
    const order = createValidOrder();

    order.userId = null;

    await expect(order.validate()).rejects.toMatchObject({
      errors: {
        userId: expect.anything(),
      },
    });
  });

  it("rechaza pedidos sin artículos", async () => {
    const order = createValidOrder();

    order.items.splice(0, order.items.length);

    await expect(order.validate()).rejects.toMatchObject({
      errors: {
        items: expect.anything(),
      },
    });
  });

  it("declara únicos el folio y la cotización", () => {
    expect(OrderModel.schema.paths.orderNumber?.options).toMatchObject({
      unique: true,
    });

    expect(OrderModel.schema.paths.quoteId?.options).toMatchObject({
      unique: true,
    });
  });
});
