import { describe, expect, it } from "vitest";
import { productSeeds } from "../../../src/database/seeds/product.seed-data.js";

describe("productSeeds", () => {
  it("contiene los diez productos del frontend", () => {
    expect(productSeeds).toHaveLength(10);
  });

  it("no repite externalId ni slug", () => {
    const externalIds = productSeeds.map((product) => product.externalId);
    const slugs = productSeeds.map((product) => product.slug);

    expect(new Set(externalIds).size).toBe(productSeeds.length);
    expect(new Set(slugs).size).toBe(productSeeds.length);
  });

  it("almacena precios y modificadores en centavos enteros", () => {
    for (const product of productSeeds) {
      expect(Number.isInteger(product.basePriceCents)).toBe(true);

      for (const format of product.formats) {
        expect(Number.isInteger(format.priceAdjustmentCents)).toBe(true);
      }

      for (const option of product.options) {
        for (const value of option.values) {
          expect(Number.isInteger(value.priceModifierCents)).toBe(true);
        }
      }
    }
  });

  it("incluye los tres formatos y un área de impresión", () => {
    for (const product of productSeeds) {
      expect(product.formats.map((format) => format.value)).toEqual([
        "standard",
        "large",
        "premium",
      ]);

      expect(product.printArea.width).toBeGreaterThan(0);
      expect(product.printArea.height).toBeGreaterThan(0);
    }
  });
});
