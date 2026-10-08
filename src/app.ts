import { paymentRouter } from "./modules/payments/routes/payment.routes.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { authRouter } from "./modules/auth/routes/auth.routes.js";
import { designRouter } from "./modules/catalog/routes/design.routes.js";
import { productRouter } from "./modules/catalog/routes/product.routes.js";
import { checkoutRouter } from "./modules/checkout/routes/checkout.routes.js";
import { healthRouter } from "./modules/health/health.routes.js";
import { guestOrderRouter } from "./modules/orders/routes/guest-order.routes.js";
import { orderRouter } from "./modules/orders/routes/order.routes.js";
import { logger } from "./shared/logger/logger.js";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");

  app.use(
    pinoHttp({
      logger,
    }),
  );

  app.use(helmet());

  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    }),
  );

  app.use("/api/v1/payments", paymentRouter);

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  app.use("/api/v1/health", healthRouter);
  app.use("/api/v1/products", productRouter);
  app.use("/api/v1/designs", designRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/checkout", checkoutRouter);
  app.use("/api/v1/guest-orders", guestOrderRouter);
  app.use("/api/v1/orders", orderRouter);

  app.use((request, response) => {
    response.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.originalUrl} was not found.`,
        details: [],
      },
    });
  });

  const errorHandler: ErrorRequestHandler = (
    error,
    request,
    response,
    next,
  ) => {
    logger.error(
      {
        error,
        method: request.method,
        path: request.originalUrl,
      },
      "Unhandled request error",
    );

    if (response.headersSent) {
      next(error);
      return;
    }

    response.status(500).json({
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred.",
        details: [],
      },
    });
  };

  app.use(errorHandler);

  return app;
}
