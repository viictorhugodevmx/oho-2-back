import type { DesignDocument } from "../models/design.model.js";
import type { ProductDocument } from "../models/product.model.js";

export type ProductCategory = ProductDocument["category"];

export type ProductFormat = ProductDocument["formats"][number]["value"];

export type DesignCategory = DesignDocument["category"];

export interface ProductFormatDto {
  value: ProductFormat;
  label: string;
  priceAdjustmentCents: number;
}

export interface ProductOptionValueDto {
  id: string;
  label: string;
  value: string;
  priceModifierCents: number;
  colorHex: string | null;
}

export interface ProductOptionDto {
  id: string;
  name: string;
  values: ProductOptionValueDto[];
}

export interface PrintAreaDto {
  top: number;
  left: number;
  width: number;
  height: number;
  rotation: number | null;
}

export interface ProductDto {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: ProductCategory;
  basePriceCents: number;
  imageUrl: string;
  gallery: string[];
  featured: boolean;
  badge: string | null;
  formats: ProductFormatDto[];
  options: ProductOptionDto[];
  printArea: PrintAreaDto;
}

export interface DesignDto {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: DesignCategory;
  imageUrl: string;
  photographer: string;
  photographerUrl: string;
  featured: boolean;
  drop: string;
  tags: string[];
}
