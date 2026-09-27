import { rateLimit } from "express-rate-limit";

interface AuthRateLimitOptions {
  windowMs: number;
  limit: number;
  message: string;
  skipSuccessfulRequests?: boolean;
}

function createAuthRateLimiter(options: AuthRateLimitOptions) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: options.skipSuccessfulRequests ?? false,
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

export const registerRateLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1_000,
  limit: 20,
  message: "Se alcanzó el límite temporal de registros. Intenta más tarde.",
});

export const loginRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1_000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Demasiados intentos de inicio de sesión. Intenta más tarde.",
});

export const refreshRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1_000,
  limit: 60,
  message: "Demasiadas solicitudes de renovación. Intenta más tarde.",
});
