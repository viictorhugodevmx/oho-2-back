import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { orderNotificationService } from "../../src/modules/notifications/services/order-notification.service.js";
import {
  GUEST_SESSION_HEADER,
  guestSessionService,
} from "../../src/modules/checkout/services/guest-session.service.js";
import type { OrderDto } from "../../src/modules/orders/dtos/order.dto.js";
import {
  GuestOrderAccessError,
  guestOrderAccessService,
} from "../../src/modules/orders/services/guest-order-access.service.js";
import { guestOrderService } from "../../src/modules/orders/services/guest-order.service.js";
import {
  GUEST_ORDER_TOKEN_HEADER,
  guestOrderTokenService,
} from "../../src/modules/orders/services/guest-order-token.service.js";
import { IdempotencyError } from "../../src/modules/orders/services/idempotency.service.js";
import { OrderServiceError } from "../../src/modules/orders/services/order.service.js";

const QUOTE_ID = "d831aa77-9303-42f6-b9d7-b61b90d59b3f";

const IDEMPOTENCY_KEY = "checkout-guest-order-001";

const ORDER_NUMBER = "OHO-20261007-A1B2C3D4";

const ACCESS_EXPIRATION = "2026-11-06T18:00:00.000Z";

const validBody = {
  quoteId: QUOTE_ID,
  contact: {
    fullName: "Cliente Invitado",
    email: "invitado@example.com",
    phone: "+52 961 123 4567",
  },
  shippingAddress: {
    addressLine1: "Avenida Central 123",
    addressLine2: "Departamento 4",
    neighborhood: "Centro",
    city: "Tuxtla Gutiérrez",
    state: "Chiapas",
    postalCode: "29000",
    country: "México",
    references: "Portón negro",
  },
};

const orderResponse: OrderDto = {
  id: "507f1f77bcf86cd799439011",
  orderNumber: ORDER_NUMBER,
  quoteId: QUOTE_ID,
  customerType: "guest",
  contact: validBody.contact,
  shippingAddress: {
    ...validBody.shippingAddress,
  },
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
      format: "standard",
      formatLabel: "Estándar",
      formatPriceAdjustmentCents: 0,
      selectedOptions: [],
      quantity: 1,
      basePriceCents: 84_900,
      unitPriceCents: 84_900,
      lineTotalCents: 84_900,
    },
  ],
  currency: "MXN",
  subtotalCents: 84_900,
  shippingCents: 14_900,
  totalCents: 99_800,
  status: "pending",
  paymentStatus: "pending",
  paymentProvider: null,
  paidAt: null,
  fulfillmentStatus: "not_requested",
  fulfillmentProvider: null,
  fulfillmentReference: null,
  fulfillmentSubmittedAt: null,
  createdAt: "2026-10-07T18:00:00.000Z",
  updatedAt: "2026-10-07T18:00:00.000Z",
};

describe("Guest orders API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(
      orderNotificationService,
      "sendOrderConfirmation",
    ).mockResolvedValue({
      delivered: true,
      messageId: "mailpit-test-message",
    });
  });

  it("crea un pedido para una sesión invitada", async () => {
    const guestSession = guestSessionService.create();

    const guestAccessToken = guestOrderTokenService.createToken(
      orderResponse.id,
    );

    const create = vi.spyOn(guestOrderService, "create").mockResolvedValue({
      order: orderResponse,
      guestAccessToken,
      accessExpiresAt: ACCESS_EXPIRATION,
      responseStatusCode: 201,
      replayed: false,
    });

    const response = await request(createApp())
      .post("/api/v1/guest-orders")
      .set(GUEST_SESSION_HEADER, guestSession.token)
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(201);

    expect(response.body).toEqual({
      data: {
        order: orderResponse,
        guestAccessToken,
        accessExpiresAt: ACCESS_EXPIRATION,
      },
    });

    expect(create).toHaveBeenCalledWith({
      guestSessionHash: guestSession.tokenHash,
      idempotencyKey: IDEMPOTENCY_KEY,
      body: validBody,
    });

    expect(orderNotificationService.sendOrderConfirmation).toHaveBeenCalledWith(
      {
        order: orderResponse,
        guestAccessToken,
      },
    );
  });

  it("requiere una sesión invitada para crear el pedido", async () => {
    const create = vi.spyOn(guestOrderService, "create");

    const response = await request(createApp())
      .post("/api/v1/guest-orders")
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(400);

    expect(response.body.error.code).toBe("GUEST_SESSION_REQUIRED");

    expect(create).not.toHaveBeenCalled();
  });

  it("requiere una clave de idempotencia válida", async () => {
    const guestSession = guestSessionService.create();

    const create = vi.spyOn(guestOrderService, "create");

    const response = await request(createApp())
      .post("/api/v1/guest-orders")
      .set(GUEST_SESSION_HEADER, guestSession.token)
      .set("Idempotency-Key", "short")
      .send(validBody)
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_IDEMPOTENCY_KEY");

    expect(create).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo inválido", async () => {
    const guestSession = guestSessionService.create();

    const create = vi.spyOn(guestOrderService, "create");

    const response = await request(createApp())
      .post("/api/v1/guest-orders")
      .set(GUEST_SESSION_HEADER, guestSession.token)
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send({
        quoteId: "not-a-uuid",
      })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");

    expect(create).not.toHaveBeenCalled();
  });

  it("oculta cotizaciones ajenas como no encontradas", async () => {
    const guestSession = guestSessionService.create();

    vi.spyOn(guestOrderService, "create").mockRejectedValue(
      new OrderServiceError(
        "QUOTE_NOT_FOUND",
        "La cotización no existe o no pertenece a esta sesión invitada.",
      ),
    );

    const response = await request(createApp())
      .post("/api/v1/guest-orders")
      .set(GUEST_SESSION_HEADER, guestSession.token)
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(404);

    expect(response.body.error.code).toBe("QUOTE_NOT_FOUND");
  });

  it("devuelve conflictos idempotentes controlados", async () => {
    const guestSession = guestSessionService.create();

    vi.spyOn(guestOrderService, "create").mockRejectedValue(
      new IdempotencyError(
        "IDEMPOTENCY_CONFLICT",
        "La clave ya fue utilizada con otra solicitud.",
      ),
    );

    const response = await request(createApp())
      .post("/api/v1/guest-orders")
      .set(GUEST_SESSION_HEADER, guestSession.token)
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(409);

    expect(response.body.error.code).toBe("IDEMPOTENCY_CONFLICT");
  });

  it("consulta un pedido con su token invitado", async () => {
    const token = guestOrderTokenService.createToken(orderResponse.id);

    const findByOrderNumber = vi
      .spyOn(guestOrderAccessService, "findByOrderNumber")
      .mockResolvedValue(orderResponse);

    const response = await request(createApp())
      .get(`/api/v1/guest-orders/${ORDER_NUMBER.toLowerCase()}`)
      .set(GUEST_ORDER_TOKEN_HEADER, token)
      .expect(200);

    expect(response.body).toEqual({
      data: {
        order: orderResponse,
      },
    });

    expect(findByOrderNumber).toHaveBeenCalledWith(ORDER_NUMBER, token);
  });

  it("requiere el token para consultar el pedido", async () => {
    const findByOrderNumber = vi.spyOn(
      guestOrderAccessService,
      "findByOrderNumber",
    );

    const response = await request(createApp())
      .get(`/api/v1/guest-orders/${ORDER_NUMBER}`)
      .expect(400);

    expect(response.body.error.code).toBe("GUEST_ORDER_TOKEN_REQUIRED");

    expect(findByOrderNumber).not.toHaveBeenCalled();
  });

  it("rechaza tokens con formato inválido", async () => {
    const findByOrderNumber = vi.spyOn(
      guestOrderAccessService,
      "findByOrderNumber",
    );

    const response = await request(createApp())
      .get(`/api/v1/guest-orders/${ORDER_NUMBER}`)
      .set(GUEST_ORDER_TOKEN_HEADER, "invalid-token")
      .expect(400);

    expect(response.body.error.code).toBe("INVALID_GUEST_ORDER_TOKEN");

    expect(findByOrderNumber).not.toHaveBeenCalled();
  });

  it("no revela si falló el folio o el token", async () => {
    const token = guestOrderTokenService.createToken(orderResponse.id);

    vi.spyOn(guestOrderAccessService, "findByOrderNumber").mockRejectedValue(
      new GuestOrderAccessError(),
    );

    const response = await request(createApp())
      .get(`/api/v1/guest-orders/${ORDER_NUMBER}`)
      .set(GUEST_ORDER_TOKEN_HEADER, token)
      .expect(404);

    expect(response.body).toEqual({
      error: {
        code: "GUEST_ORDER_NOT_FOUND",
        message: "El pedido no existe o el acceso invitado no es válido.",
        details: [],
      },
    });
  });
  it("no reenvía la confirmación invitada durante un replay", async () => {
    const guestSession = guestSessionService.create();

    const guestAccessToken = guestOrderTokenService.createToken(
      orderResponse.id,
    );

    vi.spyOn(guestOrderService, "create").mockResolvedValue({
      order: orderResponse,
      guestAccessToken,
      accessExpiresAt: ACCESS_EXPIRATION,
      responseStatusCode: 201,
      replayed: true,
    });

    await request(createApp())
      .post("/api/v1/guest-orders")
      .set(GUEST_SESSION_HEADER, guestSession.token)
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(201);

    expect(
      orderNotificationService.sendOrderConfirmation,
    ).not.toHaveBeenCalled();
  });
});
