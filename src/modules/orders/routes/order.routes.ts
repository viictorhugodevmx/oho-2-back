import { Router } from "express";

import { authenticate } from "../../auth/middlewares/authenticate.js";
import { createAccountCheckoutSession } from "../../payments/controllers/checkout-session.controller.js";
import { checkoutSessionRateLimiter } from "../../payments/middlewares/payment-rate-limit.js";
import {
  createAccountOrder,
  getAccountOrder,
  listAccountOrders,
} from "../controllers/order.controller.js";
import { createOrderRateLimiter } from "../middlewares/order-rate-limit.js";

export const orderRouter = Router();

orderRouter.post("/", authenticate, createOrderRateLimiter, createAccountOrder);

orderRouter.post(
  "/me/:orderNumber/checkout-session",
  authenticate,
  checkoutSessionRateLimiter,
  createAccountCheckoutSession,
);

orderRouter.get("/me", authenticate, listAccountOrders);

orderRouter.get("/me/:orderNumber", authenticate, getAccountOrder);
