import mongoose from "mongoose";

import { env } from "../config/env.js";
import { logger } from "../shared/logger/logger.js";

mongoose.connection.on("error", (error) => {
  logger.error({ error }, "MongoDB connection error");
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

export async function connectToDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5_000,
  });

  logger.info(
    {
      database: mongoose.connection.name,
      host: mongoose.connection.host,
    },
    "MongoDB connected",
  );
}

export async function disconnectFromDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
}
