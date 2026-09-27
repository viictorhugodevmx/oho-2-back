import { z } from "zod";

import { DESIGN_CATEGORIES } from "../models/design.model.js";

export const listDesignsQuerySchema = z.object({
  category: z.enum(DESIGN_CATEGORIES).optional(),
  featured: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  sort: z.enum(["featured", "title"]).default("featured"),
});

export const designSlugParamsSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
});
