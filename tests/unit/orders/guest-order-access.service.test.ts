import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderDto } from "../../../src/modules/orders/dtos/order.dto.js";
import { mapOrderToDto } from "../../../src/modules/orders/mappers/order.mapper.js";
import { guestOrderAccessRepository } from "../../../src/modules/orders/repositories/guest-order-access.repository.js";
import { orderRepository } from "../../../src/modules/orders/repositories/order.repository.js";
import {
  GuestOrderAccessError,
  guestOrderAccessService,
} from "../../../src/modules/orders/services/guest-order-access.service.js";
import { guestOrderTokenService } from "../../../src/modules/orders/services/guest-order-token.service.js";

vi.mock("../../../src/modules/orders/mappers/order.mapper.js", () => ({
  mapOrderToDto: vi.fn(),
}));

const ORDER_NUMBER = "OHO-20261007-A1B2C3D4";
const GUEST_ACCESS_TOKEN = "A".repeat(43);
const TOKEN_HASH = "b".repeat(64);
const CURRENT_DATE = new Date("2026-10-07T18:00:00.000Z");

describe("guestOrderAccessService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta el pedido y registra el acceso mediante el hash del token", async () => {
    const orderId = new Types.ObjectId();

    const order = {
      _id: orderId,
    };

    const expectedOrder = {
      id: orderId.toString(),
      orderNumber: ORDER_NUMBER,
    } as OrderDto;

    const findOrder = vi
      .spyOn(orderRepository, "findByOrderNumberForGuest")
      .mockResolvedValue(order as never);

    const hashToken = vi
      .spyOn(guestOrderTokenService, "hashToken")
      .mockReturnValue(TOKEN_HASH);

    const recordAccess = vi
      .spyOn(guestOrderAccessRepository, "recordActiveAccess")
      .mockResolvedValue({
        orderId,
        tokenHash: TOKEN_HASH,
      } as never);

    vi.mocked(mapOrderToDto).mockReturnValue(expectedOrder);

    const result = await guestOrderAccessService.findByOrderNumber(
      ORDER_NUMBER,
      GUEST_ACCESS_TOKEN,
      CURRENT_DATE,
    );

    expect(result).toEqual(expectedOrder);

    expect(findOrder).toHaveBeenCalledWith(ORDER_NUMBER);
    expect(hashToken).toHaveBeenCalledWith(GUEST_ACCESS_TOKEN);

    expect(recordAccess).toHaveBeenCalledWith(
      orderId,
      TOKEN_HASH,
      CURRENT_DATE,
    );

    expect(mapOrderToDto).toHaveBeenCalledWith(order);
  });

  it("oculta como no encontrado un folio inexistente", async () => {
    const findOrder = vi
      .spyOn(orderRepository, "findByOrderNumberForGuest")
      .mockResolvedValue(null);

    const hashToken = vi.spyOn(guestOrderTokenService, "hashToken");

    const recordAccess = vi.spyOn(
      guestOrderAccessRepository,
      "recordActiveAccess",
    );

    await expect(
      guestOrderAccessService.findByOrderNumber(
        ORDER_NUMBER,
        GUEST_ACCESS_TOKEN,
        CURRENT_DATE,
      ),
    ).rejects.toBeInstanceOf(GuestOrderAccessError);

    expect(findOrder).toHaveBeenCalledWith(ORDER_NUMBER);
    expect(hashToken).not.toHaveBeenCalled();
    expect(recordAccess).not.toHaveBeenCalled();
    expect(mapOrderToDto).not.toHaveBeenCalled();
  });

  it("usa el mismo error genérico cuando el token no tiene acceso activo", async () => {
    const orderId = new Types.ObjectId();

    const order = {
      _id: orderId,
    };

    vi.spyOn(orderRepository, "findByOrderNumberForGuest").mockResolvedValue(
      order as never,
    );

    vi.spyOn(guestOrderTokenService, "hashToken").mockReturnValue(TOKEN_HASH);

    const recordAccess = vi
      .spyOn(guestOrderAccessRepository, "recordActiveAccess")
      .mockResolvedValue(null);

    const operation = guestOrderAccessService.findByOrderNumber(
      ORDER_NUMBER,
      GUEST_ACCESS_TOKEN,
      CURRENT_DATE,
    );

    await expect(operation).rejects.toMatchObject({
      name: "GuestOrderAccessError",
      code: "GUEST_ORDER_NOT_FOUND",
      message: "El pedido no existe o el acceso invitado no es válido.",
    });

    expect(recordAccess).toHaveBeenCalledWith(
      orderId,
      TOKEN_HASH,
      CURRENT_DATE,
    );

    expect(mapOrderToDto).not.toHaveBeenCalled();
  });
});
