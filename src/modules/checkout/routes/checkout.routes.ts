import { Router } from "express";

import { optionalAuthenticate } from "../../auth/middlewares/optional-authenticate.js";
import { createGuestSession } from "../controllers/guest-session.controller.js";
import { createQuote } from "../controllers/quote.controller.js";
import {
  guestSessionRateLimiter,
  quoteRateLimiter,
} from "../middlewares/checkout-rate-limit.js";

export const checkoutRouter = Router();

checkoutRouter.post(
  "/guest-session",
  guestSessionRateLimiter,
  createGuestSession,
);

checkoutRouter.post(
  "/quote",
  quoteRateLimiter,
  optionalAuthenticate,
  createQuote,
);
