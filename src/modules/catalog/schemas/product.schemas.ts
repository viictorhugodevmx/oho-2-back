import { z } from "zod";

import { PRODUCT_CATEGORIES } from "../models/product.model.js";

export const listProductsQuerySchema = z.object({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  featured: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  sort: z
    .enum(["featured", "name", "price-asc", "price-desc"])
    .default("featured"),
});

export const productSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
