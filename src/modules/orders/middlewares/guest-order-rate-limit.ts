import { rateLimit } from "express-rate-limit";

export const guestOrderLookupRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message:
          "Demasiadas consultas de pedidos invitados. Intenta más tarde.",
        details: [],
      },
    });
  },
});
