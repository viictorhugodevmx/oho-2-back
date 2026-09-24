import "dotenv/config";

import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const details = JSON.stringify(result.error.flatten().fieldErrors);

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = result.data;
