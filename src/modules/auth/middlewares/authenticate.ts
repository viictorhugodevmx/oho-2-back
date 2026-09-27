import type { NextFunction, Request, Response } from "express";

import { tokenService } from "../services/token.service.js";

function sendUnauthorized(response: Response): void {
  response.status(401).json({
    error: {
      code: "UNAUTHORIZED",
      message: "Debes iniciar sesión para continuar.",
      details: [],
    },
  });
}

function getBearerToken(authorization: string | undefined): string | null {
  if (!authorization) {
    return null;
  }

  const parts = authorization.split(" ");

  if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
    return null;
  }

  return parts[1];
}

export async function authenticate(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const accessToken = getBearerToken(request.get("authorization"));

  if (!accessToken) {
    sendUnauthorized(response);
    return;
  }

  try {
    request.auth = await tokenService.verifyAccessToken(accessToken);

    next();
  } catch {
    sendUnauthorized(response);
  }
}
