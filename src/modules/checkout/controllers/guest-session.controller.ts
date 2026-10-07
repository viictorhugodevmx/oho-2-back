import type { Request, Response } from "express";

import {
  GUEST_SESSION_HEADER,
  guestSessionService,
} from "../services/guest-session.service.js";

export function createGuestSession(
  _request: Request,
  response: Response,
): void {
  const session = guestSessionService.create();

  response.status(201).json({
    guestSessionToken: session.token,
    headerName: GUEST_SESSION_HEADER,
  });
}
