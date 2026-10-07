import type { NextFunction, Request, Response } from "express";

import { getBearerToken, sendUnauthorized } from "./authenticate.js";
import { tokenService } from "../services/token.service.js";

export async function optionalAuthenticate(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = request.get("authorization");

  if (!authorization) {
    next();
    return;
  }

  const accessToken = getBearerToken(authorization);

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
