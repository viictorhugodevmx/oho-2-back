import { describe, expect, it } from "vitest";

import { DesignModel } from "../../../src/modules/catalog/models/design.model.js";
import { ProductModel } from "../../../src/modules/catalog/models/product.model.js";
import {
  QuotePricingError,
  quotePricingService,
  type QuotePricingErrorCode,
} from "../../../src/modules/checkout/services/quote-pricing.service.js";

function createProduct() {
  return new ProductModel({
    externalId: "product-002",
    slug: "hoodie-after-hours",
    name: "Hoodie After Hours",
    shortDescription: "Hoodie de prueba.",
    description: "Hoodie utilizado para validar precios.",
    category: "apparel",
    basePriceCents: 84_900,
    imageUrl: "https://example.com/hoodie.jpg",
    gallery: [],
    featured: true,
    active: true,
    formats: [
      {
        value: "standard",
        label: "Estándar",
        priceAdjustmentCents: 0,
      },
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
    description: "Diseño utilizado para validar precios.",
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

function expectPricingError(
  operation: () => unknown,
  expectedCode: QuotePricingErrorCode,
): void {
  try {
    operation();
    throw new Error("Expected quote pricing operation to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(QuotePricingError);
    expect((error as QuotePricingError).code).toBe(expectedCode);
  }
}

describe("quotePricingService.calculateItem", () => {
  it("calcula el precio usando base, formato, opciones y cantidad", () => {
    const result = quotePricingService.calculateItem(
      createProduct(),
      createDesign(),
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
    );

    expect(result.basePriceCents).toBe(84_900);
    expect(result.formatPriceAdjustmentCents).toBe(18_000);
    expect(result.unitPriceCents).toBe(105_400);
    expect(result.lineTotalCents).toBe(210_800);
    expect(result.selectedOptions).toHaveLength(2);
  });

  it("rechaza un formato no disponible", () => {
    expectPricingError(
      () =>
        quotePricingService.calculateItem(createProduct(), createDesign(), {
          productSlug: "hoodie-after-hours",
          designSlug: "front-row-pressure",
          format: "premium",
          quantity: 1,
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
        }),
      "FORMAT_UNAVAILABLE",
    );
  });

  it("rechaza una opción obligatoria faltante", () => {
    expectPricingError(
      () =>
        quotePricingService.calculateItem(createProduct(), createDesign(), {
          productSlug: "hoodie-after-hours",
          designSlug: "front-row-pressure",
          format: "standard",
          quantity: 1,
          selectedOptions: [
            {
              optionId: "size",
              valueId: "size-m",
            },
          ],
        }),
      "OPTION_REQUIRED",
    );
  });

  it("rechaza un valor que no pertenece a la opción", () => {
    expectPricingError(
      () =>
        quotePricingService.calculateItem(createProduct(), createDesign(), {
          productSlug: "hoodie-after-hours",
          designSlug: "front-row-pressure",
          format: "standard",
          quantity: 1,
          selectedOptions: [
            {
              optionId: "size",
              valueId: "size-xl",
            },
            {
              optionId: "color",
              valueId: "color-red",
            },
          ],
        }),
      "OPTION_VALUE_INVALID",
    );
  });

  it("rechaza productos inactivos", () => {
    const product = createProduct();
    product.active = false;

    expectPricingError(
      () =>
        quotePricingService.calculateItem(product, createDesign(), {
          productSlug: "hoodie-after-hours",
          designSlug: "front-row-pressure",
          format: "standard",
          quantity: 1,
          selectedOptions: [],
        }),
      "PRODUCT_UNAVAILABLE",
    );
  });

  it("rechaza diseños inactivos", () => {
    const design = createDesign();
    design.active = false;

    expectPricingError(
      () =>
        quotePricingService.calculateItem(createProduct(), design, {
          productSlug: "hoodie-after-hours",
          designSlug: "front-row-pressure",
          format: "standard",
          quantity: 1,
          selectedOptions: [],
        }),
      "DESIGN_UNAVAILABLE",
    );
  });
});
