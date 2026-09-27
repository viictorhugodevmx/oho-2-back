import type { NextFunction, Request, Response } from "express";

import { setRefreshCookie } from "../http/auth-cookie.js";
import { loginSchema } from "../schemas/login.schema.js";
import { authSessionService } from "../services/auth-session.service.js";
import {
  InvalidCredentialsError,
  loginService,
} from "../services/login.service.js";

export async function login(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const validation = loginSchema.safeParse(request.body);

  if (!validation.success) {
    response.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Los datos enviados no son válidos.",
        details: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });

    return;
  }

  try {
    const user = await loginService.login(validation.data);
    const userAgent = request.get("user-agent");
    const ipAddress = request.ip;

    const session = await authSessionService.create({
      user,
      ...(userAgent ? { userAgent } : {}),
      ...(ipAddress ? { ipAddress } : {}),
    });

    setRefreshCookie(response, {
      token: session.refreshToken,
      expiresAt: session.refreshExpiresAt,
    });

    response.status(200).json(session.response);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
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
