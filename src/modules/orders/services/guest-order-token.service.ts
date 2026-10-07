import { createHash, createHmac } from "node:crypto";

import { env } from "../../../config/env.js";

export const GUEST_ORDER_TOKEN_HEADER = "x-oho-guest-order-token";

const TOKEN_CONTEXT = "oho-guest-order-access-v1";

export const guestOrderTokenService = {
  createToken(orderId: string): string {
    return createHmac("sha256", env.GUEST_ORDER_TOKEN_SECRET)
      .update(`${TOKEN_CONTEXT}:${orderId}`)
      .digest("base64url");
  },

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  },

  isValidToken(token: string): boolean {
    return token.length === 43 && /^[A-Za-z0-9_-]+$/.test(token);
  },

  getExpirationDate(currentDate = new Date()): Date {
    const milliseconds = env.GUEST_ORDER_ACCESS_TTL_DAYS * 24 * 60 * 60 * 1_000;

    return new Date(currentDate.getTime() + milliseconds);
  },
};
