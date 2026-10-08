import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import { mapOrderToDto } from "../../../src/modules/orders/mappers/order.mapper.js";
import type { Order } from "../../../src/modules/orders/models/order.model.js";

describe("mapOrderToDto", () => {
  it("expone el snapshot público sin identificadores internos", () => {
    const orderId = new Types.ObjectId();

    const order: Order & { _id: Types.ObjectId } = {
      _id: orderId,
      orderNumber: "OHO-20261007-ABCDEF12",
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
        addressLine2: "",
        neighborhood: "Moctezuma",
        city: "Morelia",
        state: "Michoacán",
        postalCode: "58030",
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
          basePriceCents: 84900,
          unitPriceCents: 84900,
          lineTotalCents: 84900,
        },
      ],
      currency: "MXN",
      subtotalCents: 84900,
      shippingCents: 14900,
      totalCents: 99800,
      status: "pending",
      paymentStatus: "pending",
      paymentProvider: null,
      paidAt: null,
      fulfillmentStatus: "not_requested",
      fulfillmentProvider: null,
      fulfillmentReference: null,
      fulfillmentSubmittedAt: null,
      createdAt: new Date("2026-10-07T18:00:00.000Z"),
      updatedAt: new Date("2026-10-07T18:00:00.000Z"),
    };

    const result = mapOrderToDto(order);

    expect(result).toMatchObject({
      id: orderId.toString(),
      orderNumber: "OHO-20261007-ABCDEF12",
      quoteId: "8be2631b-5bed-4fa8-a717-6cc2814075ca",
      customerType: "account",
      status: "pending",
      paymentStatus: "pending",
      paymentProvider: null,
      paidAt: null,
      fulfillmentStatus: "not_requested",
      fulfillmentProvider: null,
      fulfillmentReference: null,
      fulfillmentSubmittedAt: null,
      shippingAddress: {
        addressLine2: null,
        neighborhood: "Moctezuma",
        references: null,
      },
      items: [
        {
          productId: "product-002",
          designId: "design-002",
          formatLabel: "Estándar",
          selectedOptions: [
            {
              optionId: "size",
              valueId: "size-m",
            },
          ],
        },
      ],
    });

    expect(result).not.toHaveProperty("userId");
    expect(result.items[0]).not.toHaveProperty("productExternalId");
    expect(result.items[0]).not.toHaveProperty("designExternalId");
  });
});
