import { rateLimit } from "express-rate-limit";

interface CheckoutRateLimitOptions {
  windowMs: number;
  limit: number;
  message: string;
}

function createCheckoutRateLimiter(options: CheckoutRateLimitOptions) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: options.message,
          details: [],
        },
      });
    },
  });
}

export const guestSessionRateLimiter = createCheckoutRateLimiter({
  windowMs: 15 * 60 * 1_000,
  limit: 30,
  message: "Demasiadas sesiones invitadas solicitadas. Intenta más tarde.",
});

export const quoteRateLimiter = createCheckoutRateLimiter({
  windowMs: 15 * 60 * 1_000,
  limit: 120,
  message: "Demasiadas cotizaciones solicitadas. Intenta más tarde.",
});
