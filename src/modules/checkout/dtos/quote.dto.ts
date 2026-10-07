import type { ProductFormat } from "../../catalog/dtos/catalog.dto.js";

export interface QuoteSelectedOptionDto {
  optionId: string;
  optionName: string;
  valueId: string;
  valueLabel: string;
  value: string;
  priceModifierCents: number;
}

export interface QuoteItemDto {
  productId: string;
  productSlug: string;
  productName: string;
  productImageUrl: string;
  designId: string;
  designSlug: string;
  designTitle: string;
  designImageUrl: string;
  format: ProductFormat;
  formatLabel: string;
  formatPriceAdjustmentCents: number;
  selectedOptions: QuoteSelectedOptionDto[];
  quantity: number;
  basePriceCents: number;
  unitPriceCents: number;
  lineTotalCents: number;
}

export interface QuoteTotalsDto {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}

export interface CheckoutQuoteDto extends QuoteTotalsDto {
  quoteId: string;
  currency: "MXN";
  expiresAt: string;
  items: QuoteItemDto[];
}
