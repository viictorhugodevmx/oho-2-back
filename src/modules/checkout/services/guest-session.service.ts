import { createHash, randomBytes } from "node:crypto";

export const GUEST_SESSION_HEADER = "x-oho-guest-session-token";

export interface GuestSession {
  token: string;
  tokenHash: string;
}

export const guestSessionService = {
  createToken(): string {
    return randomBytes(32).toString("base64url");
  },

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  },

  isValidToken(token: string): boolean {
    return token.length === 43 && /^[A-Za-z0-9_-]+$/.test(token);
  },

  create(): GuestSession {
    const token = this.createToken();

    return {
      token,
      tokenHash: this.hashToken(token),
    };
  },
};
