import type { NextFunction, Request, Response } from "express";

import { clearRefreshCookie, getRefreshCookie } from "../http/auth-cookie.js";
import { logoutService } from "../services/logout.service.js";

export async function logout(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = getRefreshCookie(request);

    await logoutService.logout(refreshToken);
    clearRefreshCookie(response);

    response.status(204).send();
  } catch (error) {
    next(error);
  }
}
