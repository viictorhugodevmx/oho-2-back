import { rateLimit } from "express-rate-limit";

export const checkoutSessionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Demasiadas solicitudes de pago. Intenta más tarde.",
        details: [],
      },
    });
  },
});
