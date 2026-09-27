import type { NextFunction, Request, Response } from "express";

import {
  AuthenticatedUserNotFoundError,
  currentUserService,
} from "../services/current-user.service.js";

export async function getCurrentUser(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  if (!request.auth) {
    response.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "Debes iniciar sesión para continuar.",
        details: [],
      },
    });

    return;
  }

  try {
    const user = await currentUserService.getById(request.auth.userId);

    response.status(200).json({
      user,
    });
  } catch (error) {
    if (error instanceof AuthenticatedUserNotFoundError) {
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
