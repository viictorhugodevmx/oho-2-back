import type { QuoteItemDto } from "../dtos/quote.dto.js";
import type { QuoteItemInput } from "../schemas/quote.schemas.js";
import type { DesignDocument } from "../../catalog/models/design.model.js";
import type { ProductDocument } from "../../catalog/models/product.model.js";

export type QuotePricingErrorCode =
  | "PRODUCT_UNAVAILABLE"
  | "DESIGN_UNAVAILABLE"
  | "FORMAT_UNAVAILABLE"
  | "OPTION_REQUIRED"
  | "OPTION_INVALID"
  | "OPTION_VALUE_INVALID";

export class QuotePricingError extends Error {
  constructor(
    public readonly code: QuotePricingErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "QuotePricingError";
  }
}

function validateProductAndDesign(
  product: ProductDocument,
  design: DesignDocument,
): void {
  if (!product.active) {
    throw new QuotePricingError(
      "PRODUCT_UNAVAILABLE",
      `Product ${product.slug} is unavailable.`,
    );
  }

  if (!design.active) {
    throw new QuotePricingError(
      "DESIGN_UNAVAILABLE",
      `Design ${design.slug} is unavailable.`,
    );
  }
}

export const quotePricingService = {
  calculateItem(
    product: ProductDocument,
    design: DesignDocument,
    input: QuoteItemInput,
  ): QuoteItemDto {
    validateProductAndDesign(product, design);

    const format = product.formats.find(
      (availableFormat) => availableFormat.value === input.format,
    );

    if (!format) {
      throw new QuotePricingError(
        "FORMAT_UNAVAILABLE",
        `Format ${input.format} is unavailable for product ${product.slug}.`,
      );
    }

    const selections = new Map(
      input.selectedOptions.map((selectedOption) => [
        selectedOption.optionId,
        selectedOption.valueId,
      ]),
    );

    if (selections.size !== input.selectedOptions.length) {
      throw new QuotePricingError(
        "OPTION_INVALID",
        "Each product option can only be selected once.",
      );
    }

    for (const selectedOption of input.selectedOptions) {
      const productOption = product.options.find(
        (option) => option.externalId === selectedOption.optionId,
      );

      if (!productOption) {
        throw new QuotePricingError(
          "OPTION_INVALID",
          `Option ${selectedOption.optionId} is invalid for product ${product.slug}.`,
        );
      }
    }

    const selectedOptions = product.options.map((productOption) => {
      const selectedValueId = selections.get(productOption.externalId);

      if (!selectedValueId) {
        throw new QuotePricingError(
          "OPTION_REQUIRED",
          `Option ${productOption.externalId} is required for product ${product.slug}.`,
        );
      }

      const selectedValue = productOption.values.find(
        (value) => value.externalId === selectedValueId,
      );

      if (!selectedValue) {
        throw new QuotePricingError(
          "OPTION_VALUE_INVALID",
          `Value ${selectedValueId} is invalid for option ${productOption.externalId}.`,
        );
      }

      return {
        optionId: productOption.externalId,
        optionName: productOption.name,
        valueId: selectedValue.externalId,
        valueLabel: selectedValue.label,
        value: selectedValue.value,
        priceModifierCents: selectedValue.priceModifierCents,
      };
    });

    const optionsPriceCents = selectedOptions.reduce(
      (total, selectedOption) => total + selectedOption.priceModifierCents,
      0,
    );

    const unitPriceCents =
      product.basePriceCents + format.priceAdjustmentCents + optionsPriceCents;

    const lineTotalCents = unitPriceCents * input.quantity;

    return {
      productId: product.externalId,
      productSlug: product.slug,
      productName: product.name,
      productImageUrl: product.imageUrl,
      designId: design.externalId,
      designSlug: design.slug,
      designTitle: design.title,
      designImageUrl: design.imageUrl,
      format: format.value,
      formatLabel: format.label,
      formatPriceAdjustmentCents: format.priceAdjustmentCents,
      selectedOptions,
      quantity: input.quantity,
      basePriceCents: product.basePriceCents,
      unitPriceCents,
      lineTotalCents,
    };
  },
};
