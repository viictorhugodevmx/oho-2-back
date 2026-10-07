import { describe, expect, it } from "vitest";

import type { QuoteItemDto } from "../../../src/modules/checkout/dtos/quote.dto.js";
import { quoteTotalsService } from "../../../src/modules/checkout/services/quote-totals.service.js";

function createQuoteItem(lineTotalCents: number): QuoteItemDto {
  return {
    productId: "product-001",
    productSlug: "playera-backstage-pass",
    productName: "Playera Backstage Pass",
    productImageUrl: "https://example.com/product.jpg",
    designId: "design-001",
    designSlug: "after-hours",
    designTitle: "After Hours",
    designImageUrl: "https://example.com/design.jpg",
    format: "standard",
    formatLabel: "Estándar",
    formatPriceAdjustmentCents: 0,
    selectedOptions: [],
    quantity: 1,
    basePriceCents: lineTotalCents,
    unitPriceCents: lineTotalCents,
    lineTotalCents,
  };
}

describe("quoteTotalsService.calculate", () => {
  it("cobra envío cuando el subtotal es menor al mínimo", () => {
    const result = quoteTotalsService.calculate([createQuoteItem(84_900)]);

    expect(result).toEqual({
      subtotalCents: 84_900,
      shippingCents: 14_900,
      totalCents: 99_800,
    });
  });

  it("suma todas las líneas antes de calcular el envío", () => {
    const result = quoteTotalsService.calculate([
      createQuoteItem(60_000),
      createQuoteItem(70_000),
    ]);

    expect(result).toEqual({
      subtotalCents: 130_000,
      shippingCents: 14_900,
      totalCents: 144_900,
    });
  });

  it("aplica envío gratuito exactamente desde el mínimo", () => {
    const result = quoteTotalsService.calculate([createQuoteItem(150_000)]);

    expect(result).toEqual({
      subtotalCents: 150_000,
      shippingCents: 0,
      totalCents: 150_000,
    });
  });

  it("mantiene envío gratuito por encima del mínimo", () => {
    const result = quoteTotalsService.calculate([createQuoteItem(210_800)]);

    expect(result).toEqual({
      subtotalCents: 210_800,
      shippingCents: 0,
      totalCents: 210_800,
    });
  });

  it("rechaza calcular totales sin artículos", () => {
    expect(() => quoteTotalsService.calculate([])).toThrowError(
      "Quote totals cannot be calculated without items.",
    );
  });
});
