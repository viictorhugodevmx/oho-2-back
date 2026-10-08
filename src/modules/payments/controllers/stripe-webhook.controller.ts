import type { NextFunction, Request, Response } from "express";

import {
  StripeWebhookSignatureError,
  stripeWebhookService,
} from "../services/stripe-webhook.service.js";

function sendError(
  response: Response,
  statusCode: number,
  code: string,
  message: string,
): void {
  response.status(statusCode).json({
    error: {
      code,
      message,
      details: [],
    },
  });
}

export async function handleStripeWebhook(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const signature = request.get("stripe-signature");

  if (!signature) {
    sendError(
      response,
      400,
      "STRIPE_SIGNATURE_REQUIRED",
      "El webhook requiere la firma de Stripe.",
    );

    return;
  }

  if (!Buffer.isBuffer(request.body)) {
    sendError(
      response,
      400,
      "STRIPE_RAW_BODY_REQUIRED",
      "El webhook requiere el cuerpo crudo de la solicitud.",
    );

    return;
  }

  try {
    const result = await stripeWebhookService.process(request.body, signature);

    response.status(200).json({
      received: true,
      eventId: result.eventId,
      eventType: result.eventType,
      status: result.status,
    });
  } catch (error) {
    if (error instanceof StripeWebhookSignatureError) {
      sendError(response, 400, error.code, error.message);

      return;
    }

    next(error);
  }
}
