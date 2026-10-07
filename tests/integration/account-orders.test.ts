import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { tokenService } from "../../src/modules/auth/services/token.service.js";
import type { OrderDto } from "../../src/modules/orders/dtos/order.dto.js";
import { IdempotencyError } from "../../src/modules/orders/services/idempotency.service.js";
import {
  OrderServiceError,
  orderService,
} from "../../src/modules/orders/services/order.service.js";

const USER_ID = "507f1f77bcf86cd799439011";
const QUOTE_ID = "d831aa77-9303-42f6-b9d7-b61b90d59b3f";
const IDEMPOTENCY_KEY = "checkout-account-order-001";
const ORDER_NUMBER = "OHO-20261007-A1B2C3D4";

const validBody = {
  quoteId: QUOTE_ID,
  contact: {
    fullName: "Víctor Hugo Segundo Aguilar",
    email: "victor@example.com",
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
  id: "507f1f77bcf86cd799439012",
  orderNumber: ORDER_NUMBER,
  quoteId: QUOTE_ID,
  customerType: "account",
  contact: {
    fullName: "Víctor Hugo Segundo Aguilar",
    email: "victor@example.com",
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
      selectedOptions: [
        {
          optionId: "size",
          optionName: "Talla",
          valueId: "size-m",
          valueLabel: "M",
          value: "m",
          priceModifierCents: 0,
        },
      ],
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
  fulfillmentStatus: "pending",
  createdAt: "2026-10-07T18:00:00.000Z",
  updatedAt: "2026-10-07T18:00:00.000Z",
};

function mockAuthentication(): void {
  vi.spyOn(tokenService, "verifyAccessToken").mockResolvedValue({
    userId: USER_ID,
    role: "customer",
  });
}

describe("Account orders API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("crea un pedido para la cuenta autenticada", async () => {
    mockAuthentication();

    const createForAccount = vi
      .spyOn(orderService, "createForAccount")
      .mockResolvedValue({
        order: orderResponse,
        responseStatusCode: 201,
        replayed: false,
      });

    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", "Bearer valid-access-token")
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(201);

    expect(response.body).toEqual({
      data: orderResponse,
    });

    expect(createForAccount).toHaveBeenCalledOnce();

    const input = createForAccount.mock.calls[0]?.[0];

    expect(input?.userId.toString()).toBe(USER_ID);
    expect(input?.idempotencyKey).toBe(IDEMPOTENCY_KEY);
    expect(input?.body).toEqual(validBody);
  });

  it("rechaza crear un pedido sin autenticación", async () => {
    const createForAccount = vi.spyOn(orderService, "createForAccount");

    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(401);

    expect(response.body.error.code).toBe("UNAUTHORIZED");
    expect(createForAccount).not.toHaveBeenCalled();
  });

  it("requiere la clave de idempotencia", async () => {
    mockAuthentication();

    const createForAccount = vi.spyOn(orderService, "createForAccount");

    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", "Bearer valid-access-token")
      .send(validBody)
      .expect(400);

    expect(response.body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
    expect(createForAccount).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo inválido", async () => {
    mockAuthentication();

    const createForAccount = vi.spyOn(orderService, "createForAccount");

    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", "Bearer valid-access-token")
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send({
        quoteId: "not-a-uuid",
      })
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(createForAccount).not.toHaveBeenCalled();
  });

  it("devuelve conflicto cuando la idempotencia no coincide", async () => {
    mockAuthentication();

    vi.spyOn(orderService, "createForAccount").mockRejectedValue(
      new IdempotencyError(
        "IDEMPOTENCY_CONFLICT",
        "La clave ya fue utilizada con otra solicitud.",
      ),
    );

    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", "Bearer valid-access-token")
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(409);

    expect(response.body).toEqual({
      error: {
        code: "IDEMPOTENCY_CONFLICT",
        message: "La clave ya fue utilizada con otra solicitud.",
        details: [],
      },
    });
  });

  it("devuelve 404 cuando la cotización no pertenece a la cuenta", async () => {
    mockAuthentication();

    vi.spyOn(orderService, "createForAccount").mockRejectedValue(
      new OrderServiceError(
        "QUOTE_NOT_FOUND",
        "La cotización no existe o no pertenece a tu cuenta.",
      ),
    );

    const response = await request(createApp())
      .post("/api/v1/orders")
      .set("Authorization", "Bearer valid-access-token")
      .set("Idempotency-Key", IDEMPOTENCY_KEY)
      .send(validBody)
      .expect(404);

    expect(response.body.error.code).toBe("QUOTE_NOT_FOUND");
  });

  it("lista únicamente los pedidos de la cuenta autenticada", async () => {
    mockAuthentication();

    const listForAccount = vi
      .spyOn(orderService, "listForAccount")
      .mockResolvedValue([orderResponse]);

    const response = await request(createApp())
      .get("/api/v1/orders/me")
      .set("Authorization", "Bearer valid-access-token")
      .expect(200);

    expect(response.body).toEqual({
      data: [orderResponse],
    });

    expect(listForAccount.mock.calls[0]?.[0].toString()).toBe(USER_ID);
  });

  it("consulta un pedido de la cuenta por su folio", async () => {
    mockAuthentication();

    const findForAccount = vi
      .spyOn(orderService, "findForAccount")
      .mockResolvedValue(orderResponse);

    const response = await request(createApp())
      .get(`/api/v1/orders/me/${ORDER_NUMBER.toLowerCase()}`)
      .set("Authorization", "Bearer valid-access-token")
      .expect(200);

    expect(response.body).toEqual({
      data: orderResponse,
    });

    expect(findForAccount.mock.calls[0]?.[0]).toBe(ORDER_NUMBER);
    expect(findForAccount.mock.calls[0]?.[1].toString()).toBe(USER_ID);
  });

  it("oculta como no encontrado un pedido ajeno", async () => {
    mockAuthentication();

    vi.spyOn(orderService, "findForAccount").mockRejectedValue(
      new OrderServiceError(
        "ORDER_NOT_FOUND",
        "El pedido no existe o no pertenece a tu cuenta.",
      ),
    );

    const response = await request(createApp())
      .get(`/api/v1/orders/me/${ORDER_NUMBER}`)
      .set("Authorization", "Bearer valid-access-token")
      .expect(404);

    expect(response.body.error.code).toBe("ORDER_NOT_FOUND");
  });

  it("rechaza un folio con formato inválido", async () => {
    mockAuthentication();

    const findForAccount = vi.spyOn(orderService, "findForAccount");

    const response = await request(createApp())
      .get("/api/v1/orders/me/folio-invalido")
      .set("Authorization", "Bearer valid-access-token")
      .expect(400);

    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(findForAccount).not.toHaveBeenCalled();
  });
});
