import type { NextFunction, Request, Response } from "express";

import { orderNumberParamsSchema } from "../../orders/schemas/order.schemas.js";
import {
  GUEST_ORDER_TOKEN_HEADER,
  guestOrderTokenService,
} from "../../orders/services/guest-order-token.service.js";
import {
  CheckoutSessionError,
  checkoutSessionService,
} from "../services/checkout-session.service.js";

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

function resolveOrderNumber(
  request: Request,
  response: Response,
): string | null {
  const validation = orderNumberParamsSchema.safeParse(request.params);

  if (!validation.success) {
    sendError(
      response,
      400,
      "VALIDATION_ERROR",
      "El folio enviado no tiene un formato válido.",
      validation.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );

    return null;
  }

  return validation.data.orderNumber;
}

function handleCheckoutError(error: unknown, response: Response): boolean {
  if (!(error instanceof CheckoutSessionError)) {
    return false;
  }

  const statusCode = error.code === "PAYMENT_ORDER_NOT_FOUND" ? 404 : 409;

  sendError(response, statusCode, error.code, error.message);

  return true;
}

export async function createAccountCheckoutSession(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const orderNumber = resolveOrderNumber(request, response);

  if (!orderNumber) {
    return;
  }

  if (!request.auth) {
    sendError(response, 401, "UNAUTHORIZED", "Debes iniciar sesión.");

    return;
  }

  try {
    const result = await checkoutSessionService.createForAccount(
      orderNumber,
      request.auth.userId,
    );

    response.status(result.reused ? 200 : 201).json({
      data: result.session,
    });
  } catch (error) {
    if (handleCheckoutError(error, response)) {
      return;
    }

    next(error);
  }
}

export async function createGuestCheckoutSession(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const orderNumber = resolveOrderNumber(request, response);

  if (!orderNumber) {
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
    const result = await checkoutSessionService.createForGuest(
      orderNumber,
      token,
    );

    response.status(result.reused ? 200 : 201).json({
      data: result.session,
    });
  } catch (error) {
    if (handleCheckoutError(error, response)) {
      return;
    }

    next(error);
  }
}
