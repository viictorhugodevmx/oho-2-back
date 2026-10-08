import { Router } from "express";

import { createGuestCheckoutSession } from "../../payments/controllers/checkout-session.controller.js";
import { checkoutSessionRateLimiter } from "../../payments/middlewares/payment-rate-limit.js";
import {
  createGuestOrder,
  getGuestOrder,
} from "../controllers/guest-order.controller.js";
import { guestOrderLookupRateLimiter } from "../middlewares/guest-order-rate-limit.js";
import { createOrderRateLimiter } from "../middlewares/order-rate-limit.js";

export const guestOrderRouter = Router();

guestOrderRouter.post("/", createOrderRateLimiter, createGuestOrder);

guestOrderRouter.post(
  "/:orderNumber/checkout-session",
  checkoutSessionRateLimiter,
  createGuestCheckoutSession,
);

guestOrderRouter.get(
  "/:orderNumber",
  guestOrderLookupRateLimiter,
  getGuestOrder,
);
