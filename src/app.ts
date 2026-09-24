import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { healthRouter } from "./modules/health/health.routes.js";
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

  app.use(express.json({ limit: "1mb" }));

  app.use("/api/v1/health", healthRouter);

  app.use((request, response) => {
    response.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: `Route ${request.method} ${request.originalUrl} was not found.`,
        details: [],
      },
    });
  });

  return app;
}
