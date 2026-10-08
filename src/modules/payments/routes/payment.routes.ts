import { Router, raw } from "express";

import { handleStripeWebhook } from "../controllers/stripe-webhook.controller.js";

export const paymentRouter = Router();

paymentRouter.post(
  "/stripe/webhook",
  raw({
    type: "application/json",
    limit: "1mb",
  }),
  handleStripeWebhook,
);
