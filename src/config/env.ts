import "dotenv/config";

import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  AUTH_ACCESS_TOKEN_SECRET: z.string().min(32),
  AUTH_ACCESS_TOKEN_TTL_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .max(60)
    .default(15),
  AUTH_REFRESH_TOKEN_TTL_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .max(90)
    .default(30),
  AUTH_REFRESH_COOKIE_NAME: z.string().min(1).default("oho_refresh_token"),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const details = JSON.stringify(result.error.flatten().fieldErrors);

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = result.data;
