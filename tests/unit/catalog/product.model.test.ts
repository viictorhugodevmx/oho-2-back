import { describe, expect, it } from "vitest";

import { ProductModel } from "../../../src/modules/catalog/models/product.model.js";

function createValidProduct() {
  return new ProductModel({
    externalId: "product-test-001",
    slug: "playera-test",
    name: "Playera Test",
    shortDescription: "Producto utilizado por las pruebas.",
    description: "Descripción completa del producto utilizado por las pruebas.",
    category: "apparel",
    basePriceCents: 44900,
    imageUrl: "https://example.com/product.jpg",
    gallery: [],
    featured: true,
    active: true,
    badge: "TEST",
    formats: [
      {
        value: "standard",
        label: "Estándar",
        priceAdjustmentCents: 0,
      },
      {
        value: "large",
        label: "Grande",
        priceAdjustmentCents: 18000,
      },
      {
        value: "premium",
        label: "Premium",
        priceAdjustmentCents: 32000,
      },
    ],
    options: [
      {
        externalId: "size",
        name: "Talla",
        values: [
          {
            externalId: "size-l",
            label: "L",
            value: "l",
            priceModifierCents: 0,
          },
        ],
      },
    ],
    printArea: {
      top: 23,
      left: 32,
      width: 36,
      height: 42,
    },
  });
}

describe("ProductModel", () => {
  it("accepts a valid product", async () => {
    const product = createValidProduct();

    await expect(product.validate()).resolves.toBeUndefined();

    expect(product.basePriceCents).toBe(44900);
    expect(product.formats).toHaveLength(3);
  });

  it("rejects prices containing fractions of a cent", async () => {
    const product = createValidProduct();

    product.basePriceCents = 44900.5;

    await expect(product.validate()).rejects.toThrow(
      "basePriceCents must be an integer",
    );
  });

  it("rejects an invalid slug", async () => {
    const product = createValidProduct();

    product.slug = "Playera con espacios";

    await expect(product.validate()).rejects.toThrow("Path `slug` is invalid");
  });

  it("rejects an empty formats collection", async () => {
    const product = createValidProduct();

    product.formats.splice(0, product.formats.length);

    await expect(product.validate()).rejects.toThrow(
      "A product must contain at least one format",
    );
  });
});
