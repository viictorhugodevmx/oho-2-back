import { createHash, randomBytes, randomUUID } from "node:crypto";

import { SignJWT, jwtVerify } from "jose";

import { env } from "../../../config/env.js";
import { USER_ROLES, type UserRole } from "../models/user.model.js";

const ACCESS_TOKEN_ISSUER = "oho-2-back";
const ACCESS_TOKEN_AUDIENCE = "oho-2-front";

const accessTokenSecret = new TextEncoder().encode(
  env.AUTH_ACCESS_TOKEN_SECRET,
);

export interface AccessTokenUser {
  userId: string;
  role: UserRole;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.some((role) => role === value);
}

export const tokenService = {
  async issueAccessToken(user: AccessTokenUser): Promise<string> {
    return new SignJWT({
      role: user.role,
    })
      .setProtectedHeader({
        alg: "HS256",
        typ: "JWT",
      })
      .setSubject(user.userId)
      .setIssuer(ACCESS_TOKEN_ISSUER)
      .setAudience(ACCESS_TOKEN_AUDIENCE)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(`${env.AUTH_ACCESS_TOKEN_TTL_MINUTES}m`)
      .sign(accessTokenSecret);
  },

  async verifyAccessToken(token: string): Promise<AccessTokenUser> {
    const { payload } = await jwtVerify(token, accessTokenSecret, {
      issuer: ACCESS_TOKEN_ISSUER,
      audience: ACCESS_TOKEN_AUDIENCE,
    });

    if (!payload.sub || !isUserRole(payload.role)) {
      throw new Error("Invalid access token payload.");
    }

    return {
      userId: payload.sub,
      role: payload.role,
    };
  },

  createRefreshToken(): string {
    return randomBytes(48).toString("base64url");
  },

  hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  },

  getRefreshExpirationDate(): Date {
    const milliseconds = env.AUTH_REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1_000;

    return new Date(Date.now() + milliseconds);
  },
};
