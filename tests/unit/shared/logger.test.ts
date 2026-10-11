import pino from "pino";
import { describe, expect, it } from "vitest";

import { loggerOptions } from "../../../src/shared/logger/logger.js";

describe("logger", () => {
  it("oculta credenciales y conserva headers útiles", () => {
    const output: string[] = [];

    const destination = {
      write(message: string) {
        output.push(message);
      },
    };

    const testLogger = pino(
      {
        ...loggerOptions,
        level: "info",
      },
      destination,
    );

    testLogger.info({
      req: {
        headers: {
          host: "localhost:4000",
          authorization: "Bearer private-access-token",
          cookie: "oho_refresh_token=private-refresh-token",
          "x-oho-guest-session-token": "private-guest-session",
          "x-oho-guest-order-token": "private-guest-order-token",
          "stripe-signature": "private-stripe-signature",
        },
        body: {
          password: "private-password",
          accessToken: "private-access-token",
          refreshToken: "private-refresh-token",
          guestAccessToken: "private-guest-order-token",
        },
      },
      res: {
        headers: {
          "content-type": "application/json",
          "set-cookie": "oho_refresh_token=private-refresh-token",
        },
      },
    });

    const entry = JSON.parse(output.at(0) ?? "{}") as {
      req: {
        headers: Record<string, string>;
        body: Record<string, string>;
      };
      res: {
        headers: Record<string, string>;
      };
    };

    expect(entry.req.headers.host).toBe("localhost:4000");

    expect(entry.req.headers.authorization).toBe("[REDACTED]");

    expect(entry.req.headers.cookie).toBe("[REDACTED]");

    expect(entry.req.headers["x-oho-guest-session-token"]).toBe("[REDACTED]");

    expect(entry.req.headers["x-oho-guest-order-token"]).toBe("[REDACTED]");

    expect(entry.req.headers["stripe-signature"]).toBe("[REDACTED]");

    expect(entry.req.body.password).toBe("[REDACTED]");

    expect(entry.req.body.accessToken).toBe("[REDACTED]");

    expect(entry.req.body.refreshToken).toBe("[REDACTED]");

    expect(entry.req.body.guestAccessToken).toBe("[REDACTED]");

    expect(entry.res.headers["set-cookie"]).toBe("[REDACTED]");

    expect(JSON.stringify(entry)).not.toContain("private-");
  });
});
