import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { tokenService } from "../../src/modules/auth/services/token.service.js";
import {
  GUEST_SESSION_HEADER,
  guestSessionService,
} from "../../src/modules/checkout/services/guest-session.service.js";
import { QuotePricingError } from "../../src/modules/checkout/services/quote-pricing.service.js";
import { quoteService } from "../../src/modules/checkout/services/quote.service.js";

const validBody = {
  items: [
    {
      productSlug: "hoodie-after-hours",
      designSlug: "front-row-pressure",
      format: "standard",
      quantity: 1,
      selectedOptions: [
        {
          optionId: "size",
          valueId: "size-m",
        },
        {
          optionId: "color",
          valueId: "color-black",
        },
      ],
    },
  ],
};

const quoteResponse = {
  quoteId: "quote-test-001",
  currency: "MXN" as const,
  expiresAt: "2026-09-29T17:15:00.000Z",
  items: [
    {
      productId: "product-002",
      productSlug: "hoodie-after-hours",
      productName: "Hoodie After Hours",
      productImageUrl: "https://example.com/product.jpg",
      designId: "design-002",
      designSlug: "front-row-pressure",
      designTitle: "Front Row Pressure",
      designImageUrl: "https://example.com/design.jpg",
      format: "standard" as const,
      formatLabel: "Estándar",
      formatPriceAdjustmentCents: 0,
      selectedOptions: [],
      quantity: 1,
      basePriceCents: 84_900,
      unitPriceCents: 84_900,
      lineTotalCents: 84_900,
    },
  ],
  subtotalCents: 84_900,
  shippingCents: 14_900,
  totalCents: 99_800,
};

describe("Checkout quote API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("crea una cotización para una sesión invitada", async () => {
    const guestSession = guestSessionService.create();

    const create = vi
      .spyOn(quoteService, "create")
      .mockResolvedValue(quoteResponse);

    const response = await request(createApp())
      .post("/api/v1/checkout/quote")
      .set(GUEST_SESSION_HEADER, guestSession.token)
      .send(validBody)
      .expect(201);

    expect(response.body).toEqual(quoteResponse);

    expect(create).toHaveBeenCalledWith(validBody, {
      customerType: "guest",
      guestSessionHash: guestSession.tokenHash,
    });
  });

  it("crea una cotización para una cuenta autenticada", async () => {
    vi.spyOn(tokenService, "verifyAccessToken").mockResolvedValue({
      userId: "507f1f77bcf86cd799439011",
      role: "customer",
    });

    const create = vi
      .spyOn(quoteService, "create")
      .mockResolvedValue(quoteResponse);

    await request(createApp())
      .post("/api/v1/checkout/quote")
      .set("Authorization", "Bearer access-token")
      .send(validBody)
      .expect(201);

    const owner = create.mock.calls[0]?.[1];

    expect(owner).toMatchObject({
      customerType: "account",
    });

    if (owner?.customerType !== "account") {
      throw new Error("Expected an account quote owner.");
    }

    expect(owner.userId.toString()).toBe("507f1f77bcf86cd799439011");
  });

  it("requiere sesión para una cotización invitada", async () => {
    const create = vi.spyOn(quoteService, "create");

    const response = await request(createApp())
      .post("/api/v1/checkout/quote")
      .send(validBody)
      .expect(400);

    expect(response.body.error.code).toBe("GUEST_SESSION_REQUIRED");

    expect(create).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo inválido", async () => {
    const response = await request(createApp())
      .post("/api/v1/checkout/quote")
      .set(GUEST_SESSION_HEADER, guestSessionService.createToken())
      .send({
        items: [],
      })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("devuelve errores controlados de cotización", async () => {
    vi.spyOn(quoteService, "create").mockRejectedValue(
      new QuotePricingError("OPTION_REQUIRED", "Option size is required."),
    );

    const response = await request(createApp())
      .post("/api/v1/checkout/quote")
      .set(GUEST_SESSION_HEADER, guestSessionService.createToken())
      .send(validBody)
      .expect(422);

    expect(response.body).toEqual({
      error: {
        code: "OPTION_REQUIRED",
        message: "Option size is required.",
        details: [],
      },
    });
  });
});
