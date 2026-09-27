import type { Request, Response } from "express";

import { env } from "../../../config/env.js";

interface RefreshCookieInput {
  token: string;
  expiresAt: Date;
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite:
      env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    path: "/api/v1/auth",
  };
}

export function getRefreshCookie(request: Request): string | undefined {
  const cookies = request.cookies as unknown as Record<
    string,
    string | undefined
  >;

  return cookies[env.AUTH_REFRESH_COOKIE_NAME];
}

export function setRefreshCookie(
  response: Response,
  input: RefreshCookieInput,
): void {
  response.cookie(env.AUTH_REFRESH_COOKIE_NAME, input.token, {
    ...getCookieOptions(),
    expires: input.expiresAt,
  });
}

export function clearRefreshCookie(response: Response): void {
  response.clearCookie(env.AUTH_REFRESH_COOKIE_NAME, getCookieOptions());
}
