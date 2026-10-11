import pino, { type LoggerOptions } from "pino";

import { env } from "../../config/env.js";

export const loggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-oho-guest-session-token']",
      "req.headers['x-oho-guest-order-token']",
      "req.headers['stripe-signature']",
      "res.headers['set-cookie']",
      "req.body.password",
      "req.body.accessToken",
      "req.body.refreshToken",
      "req.body.guestAccessToken",
    ],
    censor: "[REDACTED]",
  },
};

export const logger = pino(loggerOptions);
