import type { DesignCategory } from "../dtos/catalog.dto.js";
import { mapDesignToDto } from "../mappers/catalog.mapper.js";
import {
  catalogRepository,
  type DesignFilters,
  type DesignSort,
} from "../repositories/catalog.repository.js";

export interface ListDesignsOptions {
  category?: DesignCategory;
  featured?: boolean;
  sort?: DesignSort;
}

export const designService = {
  async list(options: ListDesignsOptions = {}) {
    const filters: DesignFilters = {
      sort: options.sort ?? "featured",
    };

    if (options.category !== undefined) {
      filters.category = options.category;
    }

    if (options.featured !== undefined) {
      filters.featured = options.featured;
    }

    const designs = await catalogRepository.findActiveDesigns(filters);

    return designs.map((design) => mapDesignToDto(design.toObject()));
  },

  async findBySlug(slug: string) {
    const design = await catalogRepository.findActiveDesignBySlug(slug);

    if (!design) {
      return null;
    }

    return mapDesignToDto(design.toObject());
  },
};
