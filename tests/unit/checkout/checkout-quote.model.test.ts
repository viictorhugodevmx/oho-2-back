import { Types } from "mongoose";
import { describe, expect, it } from "vitest";

import { CheckoutQuoteModel } from "../../../src/modules/checkout/models/checkout-quote.model.js";

function createItem() {
  return {
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
  };
}

function createBaseQuote() {
  return {
    quoteId: "quote-test-001",
    currency: "MXN",
    items: [createItem()],
    subtotalCents: 84_900,
    shippingCents: 14_900,
    totalCents: 99_800,
    expiresAt: new Date("2026-09-27T20:00:00.000Z"),
  };
}

describe("CheckoutQuoteModel", () => {
  it("acepta una cotización de cuenta con usuario", async () => {
    const quote = new CheckoutQuoteModel({
      ...createBaseQuote(),
      customerType: "account",
      userId: new Types.ObjectId(),
    });

    await expect(quote.validate()).resolves.toBeUndefined();
    expect(quote.guestSessionHash).toBeNull();
    expect(quote.consumedAt).toBeNull();
  });

  it("acepta una cotización invitada con hash de sesión", async () => {
    const quote = new CheckoutQuoteModel({
      ...createBaseQuote(),
      customerType: "guest",
      guestSessionHash: "guest-session-hash",
    });

    await expect(quote.validate()).resolves.toBeUndefined();
    expect(quote.userId).toBeNull();
  });

  it("requiere usuario para una cotización de cuenta", async () => {
    const quote = new CheckoutQuoteModel({
      ...createBaseQuote(),
      customerType: "account",
    });

    await expect(quote.validate()).rejects.toMatchObject({
      errors: {
        userId: expect.anything(),
      },
    });
  });

  it("requiere hash para una cotización invitada", async () => {
    const quote = new CheckoutQuoteModel({
      ...createBaseQuote(),
      customerType: "guest",
    });

    await expect(quote.validate()).rejects.toMatchObject({
      errors: {
        guestSessionHash: expect.anything(),
      },
    });
  });

  it("rechaza mezclar propietario de cuenta e invitado", async () => {
    const quote = new CheckoutQuoteModel({
      ...createBaseQuote(),
      customerType: "guest",
      userId: new Types.ObjectId(),
      guestSessionHash: "guest-session-hash",
    });

    await expect(quote.validate()).rejects.toMatchObject({
      errors: {
        userId: expect.anything(),
      },
    });
  });

  it("oculta el hash de sesión en consultas normales", () => {
    const path = CheckoutQuoteModel.schema.paths.guestSessionHash;

    expect(path?.options).toMatchObject({
      select: false,
    });
  });

  it("incluye un índice TTL para eliminar cotizaciones expiradas", () => {
    const ttlIndex = CheckoutQuoteModel.schema
      .indexes()
      .find(([fields]) => fields.expiresAt === 1);

    expect(ttlIndex?.[1]).toMatchObject({
      expireAfterSeconds: 0,
    });
  });
});
