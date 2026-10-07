import type { DesignCategory, ProductCategory } from "../dtos/catalog.dto.js";
import { DesignModel } from "../models/design.model.js";
import { ProductModel } from "../models/product.model.js";

export type ProductSort = "featured" | "name" | "price-asc" | "price-desc";

export type DesignSort = "featured" | "title";

export interface ProductFilters {
  category?: ProductCategory;
  featured?: boolean;
  sort: ProductSort;
}

export interface DesignFilters {
  category?: DesignCategory;
  featured?: boolean;
  sort: DesignSort;
}

function buildProductSort(sort: ProductSort): Record<string, 1 | -1> {
  switch (sort) {
    case "name":
      return { name: 1 };

    case "price-asc":
      return { basePriceCents: 1, name: 1 };

    case "price-desc":
      return { basePriceCents: -1, name: 1 };

    case "featured":
    default:
      return { featured: -1, name: 1 };
  }
}

function buildDesignSort(sort: DesignSort): Record<string, 1 | -1> {
  switch (sort) {
    case "title":
      return { title: 1 };

    case "featured":
    default:
      return { featured: -1, title: 1 };
  }
}

export const catalogRepository = {
  findActiveProducts(filters: ProductFilters) {
    const query: {
      active: boolean;
      category?: ProductCategory;
      featured?: boolean;
    } = {
      active: true,
    };

    if (filters.category !== undefined) {
      query.category = filters.category;
    }

    if (filters.featured !== undefined) {
      query.featured = filters.featured;
    }

    return ProductModel.find(query).sort(buildProductSort(filters.sort)).exec();
  },

  findActiveProductBySlug(slug: string) {
    return ProductModel.findOne({
      slug,
      active: true,
    }).exec();
  },

  findActiveProductsBySlugs(slugs: string[]) {
    return ProductModel.find({
      slug: {
        $in: slugs,
      },
      active: true,
    }).exec();
  },

  findActiveDesigns(filters: DesignFilters) {
    const query: {
      active: boolean;
      category?: DesignCategory;
      featured?: boolean;
    } = {
      active: true,
    };

    if (filters.category !== undefined) {
      query.category = filters.category;
    }

    if (filters.featured !== undefined) {
      query.featured = filters.featured;
    }

    return DesignModel.find(query).sort(buildDesignSort(filters.sort)).exec();
  },

  findActiveDesignBySlug(slug: string) {
    return DesignModel.findOne({
      slug,
      active: true,
    }).exec();
  },

  findActiveDesignsBySlugs(slugs: string[]) {
    return DesignModel.find({
      slug: {
        $in: slugs,
      },
      active: true,
    }).exec();
  },
};
