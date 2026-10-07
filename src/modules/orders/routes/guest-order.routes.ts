import { Router } from "express";

import {
  createGuestOrder,
  getGuestOrder,
} from "../controllers/guest-order.controller.js";
import { guestOrderLookupRateLimiter } from "../middlewares/guest-order-rate-limit.js";
import { createOrderRateLimiter } from "../middlewares/order-rate-limit.js";

export const guestOrderRouter = Router();

guestOrderRouter.post("/", createOrderRateLimiter, createGuestOrder);

guestOrderRouter.get(
  "/:orderNumber",
  guestOrderLookupRateLimiter,
  getGuestOrder,
);
