import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import { createQuoteBodySchema } from "../schemas/quote.schemas.js";
import {
  GUEST_SESSION_HEADER,
  guestSessionService,
} from "../services/guest-session.service.js";
import { QuotePricingError } from "../services/quote-pricing.service.js";
import { quoteService, type QuoteOwner } from "../services/quote.service.js";

function sendValidationError(response: Response, details: unknown[]): void {
  response.status(400).json({
    error: {
      code: "VALIDATION_ERROR",
      message: "Los datos enviados no son válidos.",
      details,
    },
  });
}

function resolveOwner(request: Request, response: Response): QuoteOwner | null {
  if (request.auth) {
    if (!Types.ObjectId.isValid(request.auth.userId)) {
      response.status(401).json({
        error: {
          code: "UNAUTHORIZED",
          message: "La sesión no contiene un usuario válido.",
          details: [],
        },
      });

      return null;
    }

    return {
      customerType: "account",
      userId: new Types.ObjectId(request.auth.userId),
    };
  }

  const guestSessionToken = request.get(GUEST_SESSION_HEADER);

  if (!guestSessionToken) {
    response.status(400).json({
      error: {
        code: "GUEST_SESSION_REQUIRED",
        message: "Debes crear una sesión invitada antes de cotizar.",
        details: [],
      },
    });

    return null;
  }

  if (!guestSessionService.isValidToken(guestSessionToken)) {
    response.status(400).json({
      error: {
        code: "INVALID_GUEST_SESSION",
        message: "La sesión invitada no es válida.",
        details: [],
      },
    });

    return null;
  }

  return {
    customerType: "guest",
    guestSessionHash: guestSessionService.hashToken(guestSessionToken),
  };
}

export async function createQuote(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validation = createQuoteBodySchema.safeParse(request.body);

  if (!validation.success) {
    sendValidationError(
      response,
      validation.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );

    return;
  }

  const owner = resolveOwner(request, response);

  if (!owner) {
    return;
  }

  try {
    const quote = await quoteService.create(validation.data, owner);

    response.status(201).json(quote);
  } catch (error) {
    if (error instanceof QuotePricingError) {
      response.status(422).json({
        error: {
          code: error.code,
          message: error.message,
          details: [],
        },
      });

      return;
    }

    next(error);
  }
}
