import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/app.js";

describe("GET /api/v1/health", () => {
  it("returns the API health status", async () => {
    const response = await request(createApp()).get("/api/v1/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      service: "oho-2-back",
      environment: "test",
      uptimeSeconds: expect.any(Number),
      timestamp: expect.any(String),
    });

    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });

  it("does not expose the Express header", async () => {
    const response = await request(createApp()).get("/api/v1/health");

    expect(response.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("unknown routes", () => {
  it("returns the common not found contract", async () => {
    const response = await request(createApp()).get("/api/v1/no-existe");

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Route GET /api/v1/no-existe was not found.",
        details: [],
      },
    });
  });
});
