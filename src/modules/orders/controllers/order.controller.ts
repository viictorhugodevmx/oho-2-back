import type { NextFunction, Request, Response } from "express";
import { Types } from "mongoose";

import { orderNotificationService } from "../../notifications/services/order-notification.service.js";
import { IdempotencyError } from "../services/idempotency.service.js";
import { OrderServiceError, orderService } from "../services/order.service.js";
import {
  IDEMPOTENCY_KEY_HEADER,
  createOrderBodySchema,
  idempotencyKeySchema,
  orderNumberParamsSchema,
} from "../schemas/order.schemas.js";

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

function getAuthenticatedUserId(
  request: Request,
  response: Response,
): Types.ObjectId | null {
  if (!request.auth || !Types.ObjectId.isValid(request.auth.userId)) {
    sendError(
      response,
      401,
      "UNAUTHORIZED",
      "Debes iniciar sesión para continuar.",
    );

    return null;
  }

  return new Types.ObjectId(request.auth.userId);
}

function handleKnownError(error: unknown, response: Response): boolean {
  if (error instanceof IdempotencyError) {
    sendError(response, 409, error.code, error.message);
    return true;
  }

  if (error instanceof OrderServiceError) {
    const statusCode =
      error.code === "QUOTE_NOT_FOUND" || error.code === "ORDER_NOT_FOUND"
        ? 404
        : 409;

    sendError(response, statusCode, error.code, error.message);
    return true;
  }

  return false;
}

export async function createAccountOrder(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const userId = getAuthenticatedUserId(request, response);

  if (!userId) {
    return;
  }

  const rawIdempotencyKey = request.get(IDEMPOTENCY_KEY_HEADER);

  if (!rawIdempotencyKey) {
    sendError(
      response,
      400,
      "IDEMPOTENCY_KEY_REQUIRED",
      "Debes enviar el header Idempotency-Key.",
    );

    return;
  }

  const idempotencyValidation =
    idempotencyKeySchema.safeParse(rawIdempotencyKey);

  if (!idempotencyValidation.success) {
    sendError(
      response,
      400,
      "INVALID_IDEMPOTENCY_KEY",
      "La clave de idempotencia no tiene un formato válido.",
      idempotencyValidation.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    );

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
    const result = await orderService.createForAccount({
      userId,
      idempotencyKey: idempotencyValidation.data,
      body: bodyValidation.data,
    });

    if (!result.replayed) {
      await orderNotificationService.sendOrderConfirmation({
        order: result.order,
      });
    }

    response.status(result.responseStatusCode).json({
      data: result.order,
    });
  } catch (error) {
    if (handleKnownError(error, response)) {
      return;
    }

    next(error);
  }
}

export async function listAccountOrders(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const userId = getAuthenticatedUserId(request, response);

  if (!userId) {
    return;
  }

  try {
    const orders = await orderService.listForAccount(userId);

    response.status(200).json({
      data: orders,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAccountOrder(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const userId = getAuthenticatedUserId(request, response);

  if (!userId) {
    return;
  }

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

  try {
    const order = await orderService.findForAccount(
      paramsValidation.data.orderNumber,
      userId,
    );

    response.status(200).json({
      data: order,
    });
  } catch (error) {
    if (handleKnownError(error, response)) {
      return;
    }

    next(error);
  }
}
