import type { NextFunction, Request, Response } from "express";

import { orderNotificationService } from "../../notifications/services/order-notification.service.js";
import {
  GUEST_SESSION_HEADER,
  guestSessionService,
} from "../../checkout/services/guest-session.service.js";
import {
  IDEMPOTENCY_KEY_HEADER,
  createOrderBodySchema,
  idempotencyKeySchema,
  orderNumberParamsSchema,
} from "../schemas/order.schemas.js";
import {
  GuestOrderAccessError,
  guestOrderAccessService,
} from "../services/guest-order-access.service.js";
import { guestOrderService } from "../services/guest-order.service.js";
import {
  GUEST_ORDER_TOKEN_HEADER,
  guestOrderTokenService,
} from "../services/guest-order-token.service.js";
import { IdempotencyError } from "../services/idempotency.service.js";
import { OrderServiceError } from "../services/order.service.js";

function sendError(
  response: Response,
  statusCode: number,
  code: string,
  message: string,
  details: unknown[] = [],
): void {
  response.status(statusCode).json({
    error: {
      code,
      message,
      details,
    },
  });
}

function resolveGuestSessionHash(
  request: Request,
  response: Response,
): string | null {
  const token = request.get(GUEST_SESSION_HEADER);

  if (!token) {
    sendError(
      response,
      400,
      "GUEST_SESSION_REQUIRED",
      "Debes crear una sesión invitada antes de comprar.",
    );

    return null;
  }

  if (!guestSessionService.isValidToken(token)) {
    sendError(
      response,
      400,
      "INVALID_GUEST_SESSION",
      "La sesión invitada no es válida.",
    );

    return null;
  }

  return guestSessionService.hashToken(token);
}

function resolveIdempotencyKey(
  request: Request,
  response: Response,
): string | null {
  const rawKey = request.get(IDEMPOTENCY_KEY_HEADER);

  if (!rawKey) {
    sendError(
      response,
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Debes enviar el header Idempotency-Key.",
    );

    return null;
  }

  const validation = idempotencyKeySchema.safeParse(rawKey);

  if (!validation.success) {
    sendError(
      response,
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "La clave de idempotencia no tiene un formato válido.",
      validation.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );

    return null;
  }

  return validation.data;
}

function handleCreationError(error: unknown, response: Response): boolean {
  if (error instanceof IdempotencyError) {
    sendError(response, 409, error.code, error.message);
    return true;
  }

  if (error instanceof OrderServiceError) {
    const statusCode = error.code === "QUOTE_NOT_FOUND" ? 404 : 409;

    sendError(response, statusCode, error.code, error.message);

    return true;
  }

  return false;
}

export async function createGuestOrder(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const guestSessionHash = resolveGuestSessionHash(request, response);

  if (!guestSessionHash) {
    return;
  }

  const idempotencyKey = resolveIdempotencyKey(request, response);

  if (!idempotencyKey) {
    return;
  }

  const bodyValidation = createOrderBodySchema.safeParse(request.body);

  if (!bodyValidation.success) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "Los datos enviados no son válidos.",
      bodyValidation.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );

    return;
  }

  try {
    const result = await guestOrderService.create({
      guestSessionHash,
      idempotencyKey,
      body: bodyValidation.data,
    });

    if (!result.replayed) {
      await orderNotificationService.sendOrderConfirmation({
        order: result.order,
        guestAccessToken: result.guestAccessToken,
      });
    }

    response.status(result.responseStatusCode).json({
      data: {
        order: result.order,
        guestAccessToken: result.guestAccessToken,
        accessExpiresAt: result.accessExpiresAt,
      },
    });
  } catch (error) {
    if (handleCreationError(error, response)) {
      return;
    }

    next(error);
  }
}

export async function getGuestOrder(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const paramsValidation = orderNumberParamsSchema.safeParse(request.params);

  if (!paramsValidation.success) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "El folio enviado no tiene un formato válido.",
      paramsValidation.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );

    return;
  }

  const token = request.get(GUEST_ORDER_TOKEN_HEADER);

  if (!token) {
    sendError(
      response,
      400,
      "GUEST_ORDER_TOKEN_REQUIRED",
      "Debes enviar el token de acceso al pedido.",
    );

    return;
  }

  if (!guestOrderTokenService.isValidToken(token)) {
    sendError(
      response,
      400,
      "INVALID_GUEST_ORDER_TOKEN",
      "El token de acceso no tiene un formato válido.",
    );

    return;
  }

  try {
    const order = await guestOrderAccessService.findByOrderNumber(
      paramsValidation.data.orderNumber,
      token,
    );

    response.status(200).json({
      data: {
        order,
      },
    });
  } catch (error) {
    if (error instanceof GuestOrderAccessError) {
      sendError(response, 404, error.code, error.message);

      return;
    }

    next(error);
  }
}
