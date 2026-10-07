import { randomUUID } from "node:crypto";

import type { Types } from "mongoose";

import { catalogRepository } from "../../catalog/repositories/catalog.repository.js";
import {
  CHECKOUT_CURRENCY,
  QUOTE_TTL_MINUTES,
} from "../constants/pricing.constants.js";
import type { CheckoutQuoteDto } from "../dtos/quote.dto.js";
import type { CheckoutQuoteItem } from "../models/checkout-quote.model.js";
import { checkoutQuoteRepository } from "../repositories/checkout-quote.repository.js";
import type { CreateQuoteBody } from "../schemas/quote.schemas.js";
import {
  QuotePricingError,
  quotePricingService,
} from "./quote-pricing.service.js";
import { quoteTotalsService } from "./quote-totals.service.js";

interface AccountQuoteOwner {
  customerType: "account";
  userId: Types.ObjectId;
}

interface GuestQuoteOwner {
  customerType: "guest";
  guestSessionHash: string;
}

export type QuoteOwner = AccountQuoteOwner | GuestQuoteOwner;

export const quoteService = {
  async create(
    input: CreateQuoteBody,
    owner: QuoteOwner,
    currentDate = new Date(),
  ): Promise<CheckoutQuoteDto> {
    const productSlugs = [
      ...new Set(input.items.map((item) => item.productSlug)),
    ];

    const designSlugs = [
      ...new Set(input.items.map((item) => item.designSlug)),
    ];

    const [products, designs] = await Promise.all([
      catalogRepository.findActiveProductsBySlugs(productSlugs),
      catalogRepository.findActiveDesignsBySlugs(designSlugs),
    ]);

    const productsBySlug = new Map(
      products.map((product) => [product.slug, product]),
    );

    const designsBySlug = new Map(
      designs.map((design) => [design.slug, design]),
    );

    const items = input.items.map((item) => {
      const product = productsBySlug.get(item.productSlug);

      if (!product) {
        throw new QuotePricingError(
          "PRODUCT_UNAVAILABLE",
          `Product ${item.productSlug} is unavailable.`,
        );
      }

      const design = designsBySlug.get(item.designSlug);

      if (!design) {
        throw new QuotePricingError(
          "DESIGN_UNAVAILABLE",
          `Design ${item.designSlug} is unavailable.`,
        );
      }

      return quotePricingService.calculateItem(
        product.toObject(),
        design.toObject(),
        item,
      );
    });

    const totals = quoteTotalsService.calculate(items);
    const quoteId = randomUUID();

    const expiresAt = new Date(
      currentDate.getTime() + QUOTE_TTL_MINUTES * 60_000,
    );

    const persistedItems: CheckoutQuoteItem[] = items.map((item) => {
      const product = productsBySlug.get(item.productSlug);
      const design = designsBySlug.get(item.designSlug);

      if (!product || !design) {
        throw new Error("Validated quote references could not be persisted.");
      }

      return {
        productId: product._id,
        productExternalId: item.productId,
        productSlug: item.productSlug,
        productName: item.productName,
        productImageUrl: item.productImageUrl,
        designId: design._id,
        designExternalId: item.designId,
        designSlug: item.designSlug,
        designTitle: item.designTitle,
        designImageUrl: item.designImageUrl,
        format: item.format,
        formatLabel: item.formatLabel,
        formatPriceAdjustmentCents: item.formatPriceAdjustmentCents,
        selectedOptions: item.selectedOptions,
        quantity: item.quantity,
        basePriceCents: item.basePriceCents,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: item.lineTotalCents,
      };
    });

    await checkoutQuoteRepository.create({
      ...owner,
      quoteId,
      currency: CHECKOUT_CURRENCY,
      items: persistedItems,
      ...totals,
      expiresAt,
      consumedAt: null,
    });

    return {
      quoteId,
      currency: CHECKOUT_CURRENCY,
      expiresAt: expiresAt.toISOString(),
      items,
      ...totals,
    };
  },
};
