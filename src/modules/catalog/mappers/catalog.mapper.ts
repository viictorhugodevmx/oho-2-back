import type { DesignDto, ProductDto } from "../dtos/catalog.dto.js";
import type { DesignDocument } from "../models/design.model.js";
import type { ProductDocument } from "../models/product.model.js";

export function mapProductToDto(product: ProductDocument): ProductDto {
  return {
    id: product.externalId,
    slug: product.slug,
    name: product.name,
    shortDescription: product.shortDescription,
    description: product.description,
    category: product.category,
    basePriceCents: product.basePriceCents,
    imageUrl: product.imageUrl,
    gallery: [...product.gallery],
    featured: product.featured,
    badge: product.badge ?? null,
    formats: product.formats.map((format) => ({
      value: format.value,
      label: format.label,
      priceAdjustmentCents: format.priceAdjustmentCents,
    })),
    options: product.options.map((option) => ({
      id: option.externalId,
      name: option.name,
      values: option.values.map((value) => ({
        id: value.externalId,
        label: value.label,
        value: value.value,
        priceModifierCents: value.priceModifierCents,
        colorHex: value.colorHex ?? null,
      })),
    })),
    printArea: {
      top: product.printArea.top,
      left: product.printArea.left,
      width: product.printArea.width,
      height: product.printArea.height,
      rotation: product.printArea.rotation ?? null,
    },
  };
}

export function mapDesignToDto(design: DesignDocument): DesignDto {
  return {
    id: design.externalId,
    slug: design.slug,
    title: design.title,
    description: design.description,
    category: design.category,
    imageUrl: design.imageUrl,
    photographer: design.photographer,
    photographerUrl: design.photographerUrl,
    featured: design.featured,
    drop: design.drop,
    tags: [...design.tags],
  };
}
