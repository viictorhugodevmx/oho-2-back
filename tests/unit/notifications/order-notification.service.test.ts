import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OrderDto } from "../../../src/modules/orders/dtos/order.dto.js";
import type {
  EmailMessage,
  EmailProvider,
} from "../../../src/providers/email/email-provider.js";
import { logger } from "../../../src/shared/logger/logger.js";
import { buildOrderConfirmationEmail } from "../../../src/modules/notifications/templates/order-confirmation.template.js";
import { OrderNotificationService } from "../../../src/modules/notifications/services/order-notification.service.js";

vi.mock(
  "../../../src/modules/notifications/templates/order-confirmation.template.js",
  () => ({
    buildOrderConfirmationEmail: vi.fn(),
  }),
);

const order = {
  id: "507f1f77bcf86cd799439012",
  orderNumber: "OHO-20261007-A1B2C3D4",
  contact: {
    email: "cliente@example.com",
  },
} as OrderDto;

const emailMessage: EmailMessage = {
  to: "cliente@example.com",
  subject: "Pedido recibido",
  text: "Tu pedido fue recibido.",
  html: "<p>Tu pedido fue recibido.</p>",
};

describe("OrderNotificationService", () => {
  const provider: EmailProvider = {
    verify: vi.fn(),
    send: vi.fn(),
  };

  const service = new OrderNotificationService(provider);

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(buildOrderConfirmationEmail).mockReturnValue(emailMessage);
  });

  it("envía la confirmación y devuelve su identificador", async () => {
    vi.mocked(provider.send).mockResolvedValue({
      messageId: "mailpit-message-001",
    });

    const infoLog = vi
      .spyOn(logger, "info")
      .mockImplementation(() => undefined);

    const result = await service.sendOrderConfirmation({
      order,
    });

    expect(buildOrderConfirmationEmail).toHaveBeenCalledWith({
      order,
    });

    expect(provider.send).toHaveBeenCalledWith(emailMessage);

    expect(result).toEqual({
      delivered: true,
      messageId: "mailpit-message-001",
    });

    expect(infoLog).toHaveBeenCalledWith(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
        messageId: "mailpit-message-001",
      },
      "Order confirmation email sent",
    );
  });

  it("envía el token invitado únicamente a la plantilla", async () => {
    const guestAccessToken = "A".repeat(43);

    vi.mocked(provider.send).mockResolvedValue({
      messageId: "mailpit-message-002",
    });

    const infoLog = vi
      .spyOn(logger, "info")
      .mockImplementation(() => undefined);

    await service.sendOrderConfirmation({
      order,
      guestAccessToken,
    });

    expect(buildOrderConfirmationEmail).toHaveBeenCalledWith({
      order,
      guestAccessToken,
    });

    expect(JSON.stringify(infoLog.mock.calls)).not.toContain(guestAccessToken);
  });

  it("no propaga el error cuando SMTP falla", async () => {
    const smtpError = new Error("SMTP connection failed.");

    vi.mocked(provider.send).mockRejectedValue(smtpError);

    const errorLog = vi
      .spyOn(logger, "error")
      .mockImplementation(() => undefined);

    const result = await service.sendOrderConfirmation({
      order,
    });

    expect(result).toEqual({
      delivered: false,
      messageId: null,
    });

    expect(errorLog).toHaveBeenCalledWith(
      {
        error: smtpError,
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      "Order confirmation email delivery failed",
    );
  });
});
