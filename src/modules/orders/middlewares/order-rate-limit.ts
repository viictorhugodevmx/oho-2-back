import { rateLimit } from "express-rate-limit";

export const createOrderRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Demasiados intentos de crear pedidos. Intenta más tarde.",
        details: [],
      },
    });
  },
});
