import {
  FREE_SHIPPING_MINIMUM_CENTS,
  SHIPPING_PRICE_CENTS,
} from "../constants/pricing.constants.js";
import type { QuoteItemDto, QuoteTotalsDto } from "../dtos/quote.dto.js";

export const quoteTotalsService = {
  calculate(items: QuoteItemDto[]): QuoteTotalsDto {
    if (items.length === 0) {
      throw new Error("Quote totals cannot be calculated without items.");
    }

    const subtotalCents = items.reduce(
      (total, item) => total + item.lineTotalCents,
      0,
    );

    const shippingCents =
      subtotalCents >= FREE_SHIPPING_MINIMUM_CENTS ? 0 : SHIPPING_PRICE_CENTS;

    return {
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
    };
  },
};
