import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DesignModel } from "../../../src/modules/catalog/models/design.model.js";
import { ProductModel } from "../../../src/modules/catalog/models/product.model.js";
import { catalogRepository } from "../../../src/modules/catalog/repositories/catalog.repository.js";
import { CheckoutQuoteModel } from "../../../src/modules/checkout/models/checkout-quote.model.js";
import { checkoutQuoteRepository } from "../../../src/modules/checkout/repositories/checkout-quote.repository.js";
import type { CreateQuoteBody } from "../../../src/modules/checkout/schemas/quote.schemas.js";
import type { QuotePricingError } from "../../../src/modules/checkout/services/quote-pricing.service.js";
import {
  quoteService,
  type QuoteOwner,
} from "../../../src/modules/checkout/services/quote.service.js";

function createProduct() {
  return new ProductModel({
    externalId: "product-002",
    slug: "hoodie-after-hours",
    name: "Hoodie After Hours",
    shortDescription: "Hoodie de prueba.",
    description: "Hoodie utilizado para validar la cotización.",
    category: "apparel",
    basePriceCents: 84_900,
    imageUrl: "https://example.com/hoodie.jpg",
    gallery: [],
    featured: true,
    active: true,
    formats: [
      {
        value: "large",
        label: "Grande",
        priceAdjustmentCents: 18_000,
      },
    ],
    options: [
      {
        externalId: "size",
        name: "Talla",
        values: [
          {
            externalId: "size-m",
            label: "M",
            value: "m",
            priceModifierCents: 0,
          },
        ],
      },
      {
        externalId: "color",
        name: "Color",
        values: [
          {
            externalId: "color-red",
            label: "Rojo",
            value: "red",
            priceModifierCents: 2_500,
            colorHex: "#9d1712",
          },
        ],
      },
    ],
    printArea: {
      top: 27,
      left: 32,
      width: 36,
      height: 35,
    },
    printProviderProductId: null,
  });
}

function createDesign() {
  return new DesignModel({
    externalId: "design-002",
    slug: "front-row-pressure",
    title: "Front Row Pressure",
    description: "Diseño utilizado para validar la cotización.",
    category: "concert",
    imageUrl: "https://example.com/design.jpg",
    photographer: "OHO",
    photographerUrl: "https://example.com/photographer",
    featured: true,
    active: true,
    drop: "Drop 001",
    tags: ["concert"],
    printProviderFileId: null,
  });
}

const input: CreateQuoteBody = {
  items: [
    {
      productSlug: "hoodie-after-hours",
      designSlug: "front-row-pressure",
      format: "large",
      quantity: 2,
      selectedOptions: [
        {
          optionId: "size",
          valueId: "size-m",
        },
        {
          optionId: "color",
          valueId: "color-red",
        },
      ],
    },
  ],
};

const accountOwner: QuoteOwner = {
  customerType: "account",
  userId: new Types.ObjectId(),
};

describe("quoteService.create", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(checkoutQuoteRepository, "create").mockImplementation((record) =>
      Promise.resolve(new CheckoutQuoteModel(record)),
    );
  });

  it("consulta el catálogo, calcula y persiste la cotización", async () => {
    const productQuery = vi
      .spyOn(catalogRepository, "findActiveProductsBySlugs")
      .mockResolvedValue([createProduct()]);

    const designQuery = vi
      .spyOn(catalogRepository, "findActiveDesignsBySlugs")
      .mockResolvedValue([createDesign()]);

    const persistence = vi.spyOn(checkoutQuoteRepository, "create");

    const result = await quoteService.create(
      input,
      accountOwner,
      new Date("2026-09-27T18:00:00.000Z"),
    );

    expect(productQuery).toHaveBeenCalledWith(["hoodie-after-hours"]);

    expect(designQuery).toHaveBeenCalledWith(["front-row-pressure"]);

    expect(persistence).toHaveBeenCalledWith(
      expect.objectContaining({
        customerType: "account",
        userId: accountOwner.userId,
        currency: "MXN",
        subtotalCents: 210_800,
        shippingCents: 0,
        totalCents: 210_800,
        consumedAt: null,
      }),
    );

    expect(result.quoteId).toEqual(expect.any(String));
    expect(result.currency).toBe("MXN");
    expect(result.expiresAt).toBe("2026-09-27T18:15:00.000Z");
    expect(result.subtotalCents).toBe(210_800);
    expect(result.shippingCents).toBe(0);
    expect(result.totalCents).toBe(210_800);
    expect(result.items).toHaveLength(1);
  });

  it("rechaza un producto inexistente o inactivo", async () => {
    vi.spyOn(catalogRepository, "findActiveProductsBySlugs").mockResolvedValue(
      [],
    );

    vi.spyOn(catalogRepository, "findActiveDesignsBySlugs").mockResolvedValue([
      createDesign(),
    ]);

    await expect(
      quoteService.create(input, accountOwner),
    ).rejects.toMatchObject({
      name: "QuotePricingError",
      code: "PRODUCT_UNAVAILABLE",
    } satisfies Partial<QuotePricingError>);
  });

  it("rechaza un diseño inexistente o inactivo", async () => {
    vi.spyOn(catalogRepository, "findActiveProductsBySlugs").mockResolvedValue([
      createProduct(),
    ]);

    vi.spyOn(catalogRepository, "findActiveDesignsBySlugs").mockResolvedValue(
      [],
    );

    await expect(
      quoteService.create(input, accountOwner),
    ).rejects.toMatchObject({
      name: "QuotePricingError",
      code: "DESIGN_UNAVAILABLE",
    } satisfies Partial<QuotePricingError>);
  });
});
