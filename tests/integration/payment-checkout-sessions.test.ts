import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/app.js";
import { tokenService } from "../../src/modules/auth/services/token.service.js";
import {
  CheckoutSessionError,
  checkoutSessionService,
} from "../../src/modules/payments/services/checkout-session.service.js";

const USER_ID = "507f1f77bcf86cd799439011";

const ORDER_NUMBER = "OHO-20261007-A1B2C3D4";

const ACCESS_TOKEN = "account-access-token";

const GUEST_TOKEN = "A".repeat(43);

const session = {
  checkoutSessionId: "cs_test_checkout_001",
  checkoutUrl: "https://checkout.stripe.com/c/pay/cs_test_checkout_001",
  expiresAt: "2026-10-07T20:30:00.000Z",
};

describe("Checkout sessions API", () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(tokenService, "verifyAccessToken").mockResolvedValue({
      userId: USER_ID,
      role: "customer",
    });
  });

  it("crea Checkout para una cuenta autenticada", async () => {
    const createSession = vi
      .spyOn(checkoutSessionService, "createForAccount")
      .mockResolvedValue({
        session,
        reused: false,
      });

    const response = await request(createApp())
      .post(`/api/v1/orders/me/${ORDER_NUMBER}/checkout-session`)
      .set("Authorization", `Bearer ${ACCESS_TOKEN}`);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      data: session,
    });

    expect(createSession).toHaveBeenCalledWith(ORDER_NUMBER, USER_ID);
  });

  it("devuelve 200 al reutilizar una sesión", async () => {
    vi.spyOn(checkoutSessionService, "createForAccount").mockResolvedValue({
      session,
      reused: true,
    });

    const response = await request(createApp())
      .post(`/api/v1/orders/me/${ORDER_NUMBER}/checkout-session`)
      .set("Authorization", `Bearer ${ACCESS_TOKEN}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(session);
  });

  it("requiere autenticación para la cuenta", async () => {
    const createSession = vi.spyOn(checkoutSessionService, "createForAccount");

    const response = await request(createApp()).post(
      `/api/v1/orders/me/${ORDER_NUMBER}/checkout-session`,
    );

    expect(response.status).toBe(401);

    expect(createSession).not.toHaveBeenCalled();
  });

  it("crea Checkout para un pedido invitado", async () => {
    const createSession = vi
      .spyOn(checkoutSessionService, "createForGuest")
      .mockResolvedValue({
        session,
        reused: false,
      });

    const response = await request(createApp())
      .post(`/api/v1/guest-orders/${ORDER_NUMBER}/checkout-session`)
      .set("X-OHO-Guest-Order-Token", GUEST_TOKEN);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      data: session,
    });

    expect(createSession).toHaveBeenCalledWith(ORDER_NUMBER, GUEST_TOKEN);
  });

  it("requiere token para el pedido invitado", async () => {
    const response = await request(createApp()).post(
      `/api/v1/guest-orders/${ORDER_NUMBER}/checkout-session`,
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("GUEST_ORDER_TOKEN_REQUIRED");
  });

  it("oculta pedidos ajenos como no encontrados", async () => {
    vi.spyOn(checkoutSessionService, "createForAccount").mockRejectedValue(
      new CheckoutSessionError(
        "PAYMENT_ORDER_NOT_FOUND",
        "El pedido no existe o no tienes acceso.",
      ),
    );

    const response = await request(createApp())
      .post(`/api/v1/orders/me/${ORDER_NUMBER}/checkout-session`)
      .set("Authorization", `Bearer ${ACCESS_TOKEN}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("PAYMENT_ORDER_NOT_FOUND");
  });

  it("rechaza crear Checkout para un pedido pagado", async () => {
    vi.spyOn(checkoutSessionService, "createForAccount").mockRejectedValue(
      new CheckoutSessionError(
        "ORDER_ALREADY_PAID",
        "El pedido ya fue pagado.",
      ),
    );

    const response = await request(createApp())
      .post(`/api/v1/orders/me/${ORDER_NUMBER}/checkout-session`)
      .set("Authorization", `Bearer ${ACCESS_TOKEN}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ORDER_ALREADY_PAID");
  });
});
