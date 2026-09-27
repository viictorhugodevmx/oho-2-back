import type { NextFunction, Request, Response } from "express";

import {
  clearRefreshCookie,
  getRefreshCookie,
  setRefreshCookie,
} from "../http/auth-cookie.js";
import {
  InvalidRefreshTokenError,
  refreshService,
} from "../services/refresh.service.js";

export async function refresh(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const refreshToken = getRefreshCookie(request);

  if (!refreshToken) {
    clearRefreshCookie(response);

    response.status(401).json({
      error: {
        code: "REFRESH_TOKEN_REQUIRED",
        message: "No se encontró una sesión renovable.",
        details: [],
      },
    });

    return;
  }

  try {
    const userAgent = request.get("user-agent");
    const ipAddress = request.ip;

    const session = await refreshService.rotate({
      refreshToken,
      ...(userAgent ? { userAgent } : {}),
      ...(ipAddress ? { ipAddress } : {}),
    });

    setRefreshCookie(response, {
      token: session.refreshToken,
      expiresAt: session.refreshExpiresAt,
    });

    response.status(200).json(session.response);
  } catch (error) {
    if (error instanceof InvalidRefreshTokenError) {
      clearRefreshCookie(response);

      response.status(401).json({
        error: {
          code: error.code,
          message: error.message,
          details: [],
        },
      });

      return;
    }

    next(error);
  }
}
