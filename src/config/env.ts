import "dotenv/config";

import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65_535),
  SMTP_SECURE: z.enum(["true", "false"]).transform((value) => value === "true"),
  MAIL_FROM: z.string().min(1),
  STRIPE_SECRET_KEY: z
    .string()
    .regex(
      /^sk_test_/,
      "STRIPE_SECRET_KEY must be a Stripe Sandbox secret key.",
    ),
  STRIPE_WEBHOOK_SECRET: z
    .string()
    .regex(/^whsec_/, "STRIPE_WEBHOOK_SECRET must be a Stripe webhook secret."),
  STRIPE_CHECKOUT_SESSION_TTL_MINUTES: z.coerce
    .number()
    .int()
    .min(30)
    .max(1_440)
    .default(30),
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
  GUEST_ORDER_TOKEN_SECRET: z.string().min(32),
  GUEST_ORDER_ACCESS_TTL_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .default(30),
});

const result = environmentSchema.safeParse(process.env);

if (!result.success) {
  const details = JSON.stringify(result.error.flatten().fieldErrors);

  throw new Error(`Invalid environment configuration: ${details}`);
}

export const env = result.data;
