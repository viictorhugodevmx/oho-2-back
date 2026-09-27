import type { ProductCategory, ProductDto } from "../dtos/catalog.dto.js";
import { mapProductToDto } from "../mappers/catalog.mapper.js";
import {
  catalogRepository,
  type ProductFilters,
  type ProductSort,
} from "../repositories/catalog.repository.js";

export interface ListProductsOptions {
  category?: ProductCategory;
  featured?: boolean;
  sort?: ProductSort;
}

export const productService = {
  async list(options: ListProductsOptions = {}): Promise<ProductDto[]> {
    const filters: ProductFilters = {
      sort: options.sort ?? "featured",
    };

    if (options.category !== undefined) {
      filters.category = options.category;
    }

    if (options.featured !== undefined) {
      filters.featured = options.featured;
    }

    const products = await catalogRepository.findActiveProducts(filters);

    return products.map((product) => mapProductToDto(product.toObject()));
  },

  async findBySlug(slug: string): Promise<ProductDto | null> {
    const product = await catalogRepository.findActiveProductBySlug(slug);

    if (!product) {
      return null;
    }

    return mapProductToDto(product.toObject());
  },
};
