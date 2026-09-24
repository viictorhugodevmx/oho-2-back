import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./shared/logger/logger.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      environment: env.NODE_ENV,
      port: env.PORT,
    },
    `OHO 2.0 API listening on http://localhost:${env.PORT}`,
  );
});

function shutdown(signal: string) {
  logger.info({ signal }, "Graceful shutdown started");

  server.close((error) => {
    if (error) {
      logger.error({ error }, "Server shutdown failed");
      process.exit(1);
    }

    logger.info("HTTP server closed");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => {
  shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  shutdown("SIGTERM");
});
