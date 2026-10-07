import type { OrderDto } from "../dtos/order.dto.js";
import { mapOrderToDto } from "../mappers/order.mapper.js";
import { guestOrderAccessRepository } from "../repositories/guest-order-access.repository.js";
import { orderRepository } from "../repositories/order.repository.js";
import { guestOrderTokenService } from "./guest-order-token.service.js";

export class GuestOrderAccessError extends Error {
  readonly code = "GUEST_ORDER_NOT_FOUND";

  constructor() {
    super("El pedido no existe o el acceso invitado no es válido.");

    this.name = "GuestOrderAccessError";
  }
}

export const guestOrderAccessService = {
  async findByOrderNumber(
    orderNumber: string,
    token: string,
    currentDate = new Date(),
  ): Promise<OrderDto> {
    const order = await orderRepository.findByOrderNumberForGuest(orderNumber);

    if (!order) {
      throw new GuestOrderAccessError();
    }

    const tokenHash = guestOrderTokenService.hashToken(token);

    const access = await guestOrderAccessRepository.recordActiveAccess(
      order._id,
      tokenHash,
      currentDate,
    );

    if (!access) {
      throw new GuestOrderAccessError();
    }

    return mapOrderToDto(order);
  },
};
