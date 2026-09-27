import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

import {
  listProductsQuerySchema,
  productSlugParamsSchema,
} from "../schemas/product.schemas.js";
import { productService } from "../services/product.service.js";

function mapValidationDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export async function listProducts(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation = listProductsQuerySchema.safeParse(request.query);

    if (!validation.success) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid product query parameters.",
          details: mapValidationDetails(validation.error),
        },
      });
      return;
    }

    const options = {
      sort: validation.data.sort,
      ...(validation.data.category !== undefined
        ? { category: validation.data.category }
        : {}),
      ...(validation.data.featured !== undefined
        ? { featured: validation.data.featured }
        : {}),
    };

    const products = await productService.list(options);

    response.status(200).json({
      data: products,
      meta: {
        total: products.length,
        filters: validation.data,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getProductBySlug(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const validation = productSlugParamsSchema.safeParse(request.params);

    if (!validation.success) {
      response.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid product slug.",
          details: mapValidationDetails(validation.error),
        },
      });
      return;
    }

    const product = await productService.findBySlug(validation.data.slug);

    if (!product) {
      response.status(404).json({
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Product was not found.",
          details: [],
        },
      });
      return;
    }

    response.status(200).json({
      data: product,
    });
  } catch (error) {
    next(error);
  }
}
