import type { NextFunction, Request, Response } from "express";
import type { ZodError } from "zod";

import {
  designSlugParamsSchema,
  listDesignsQuerySchema,
} from "../schemas/design.schemas.js";
import { designService } from "../services/design.service.js";

function mapValidationDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
}

export async function listDesigns(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validation = listDesignsQuerySchema.safeParse(request.query);

  if (!validation.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The design filters are invalid.",
        details: mapValidationDetails(validation.error),
      },
    });
    return;
  }

  try {
    const options = {
      sort: validation.data.sort,
      ...(validation.data.category !== undefined
        ? { category: validation.data.category }
        : {}),
      ...(validation.data.featured !== undefined
        ? { featured: validation.data.featured }
        : {}),
    };

    const designs = await designService.list(options);

    response.status(200).json({
      data: designs,
      meta: {
        total: designs.length,
        filters: options,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDesignBySlug(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validation = designSlugParamsSchema.safeParse(request.params);

  if (!validation.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The design slug is invalid.",
        details: mapValidationDetails(validation.error),
      },
    });
    return;
  }

  try {
    const design = await designService.findBySlug(validation.data.slug);

    if (!design) {
      response.status(404).json({
        error: {
          code: "DESIGN_NOT_FOUND",
          message: "Design was not found.",
          details: [],
        },
      });
      return;
    }

    response.status(200).json({
      data: design,
    });
  } catch (error) {
    next(error);
  }
}
