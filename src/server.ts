import type { Server } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureDatabaseIndexes } from "./database/indexes.js";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "./database/mongoose.js";
import { logger } from "./shared/logger/logger.js";

const app = createApp();

let server: Server | undefined;
let isShuttingDown = false;

async function bootstrap(): Promise<void> {
  try {
    await connectToDatabase();
    await ensureDatabaseIndexes();

    server = app.listen(env.PORT, () => {
      logger.info(
        {
          environment: env.NODE_ENV,
          port: env.PORT,
        },
        `OHO 2.0 API listening on http://localhost:${env.PORT}`,
      );
    });
  } catch (error) {
    logger.fatal({ error }, "Application startup failed");
    await disconnectFromDatabase();
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  logger.info({ signal }, "Graceful shutdown started");

  const forceShutdownTimer = setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);

  forceShutdownTimer.unref();

  try {
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }

    await disconnectFromDatabase();

    clearTimeout(forceShutdownTimer);

    logger.info("Application shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Application shutdown failed");
    process.exit(1);
  }
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void bootstrap();
