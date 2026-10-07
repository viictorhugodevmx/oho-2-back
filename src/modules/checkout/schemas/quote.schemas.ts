import { z } from "zod";

import { PRODUCT_FORMATS } from "../../catalog/models/product.model.js";
import {
  MAX_CART_LINES,
  MAX_ITEM_QUANTITY,
  MAX_SELECTED_OPTIONS,
  MIN_ITEM_QUANTITY,
} from "../constants/pricing.constants.js";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const externalIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const quoteSelectedOptionSchema = z.object({
  optionId: z.string().trim().min(1).max(80).regex(externalIdPattern),
  valueId: z.string().trim().min(1).max(80).regex(externalIdPattern),
});

export const quoteItemSchema = z
  .object({
    productSlug: z.string().trim().min(1).max(160).regex(slugPattern),
    designSlug: z.string().trim().min(1).max(160).regex(slugPattern),
    format: z.enum(PRODUCT_FORMATS),
    quantity: z.coerce
      .number()
      .int()
      .min(MIN_ITEM_QUANTITY)
      .max(MAX_ITEM_QUANTITY),
    selectedOptions: z
      .array(quoteSelectedOptionSchema)
      .max(MAX_SELECTED_OPTIONS)
      .default([]),
  })
  .superRefine((item, context) => {
    const optionIds = new Set<string>();

    item.selectedOptions.forEach((selectedOption, index) => {
      if (optionIds.has(selectedOption.optionId)) {
        context.addIssue({
          code: "custom",
          message: "Each product option can only be selected once.",
          path: ["selectedOptions", index, "optionId"],
        });

        return;
      }

      optionIds.add(selectedOption.optionId);
    });
  });

export const createQuoteBodySchema = z.object({
  items: z.array(quoteItemSchema).min(1).max(MAX_CART_LINES),
});

export type CreateQuoteBody = z.infer<typeof createQuoteBodySchema>;
export type QuoteItemInput = z.infer<typeof quoteItemSchema>;
export type QuoteSelectedOptionInput = z.infer<
  typeof quoteSelectedOptionSchema
>;
