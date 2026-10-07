import type { OrderDto } from "../../orders/dtos/order.dto.js";
import { emailProvider } from "../../../providers/email/smtp-email.provider.js";
import type { EmailProvider } from "../../../providers/email/email-provider.js";
import { logger } from "../../../shared/logger/logger.js";
import { buildOrderConfirmationEmail } from "../templates/order-confirmation.template.js";

export interface SendOrderConfirmationInput {
  order: OrderDto;
  guestAccessToken?: string;
}

export interface OrderNotificationResult {
  delivered: boolean;
  messageId: string | null;
}

export class OrderNotificationService {
  constructor(private readonly provider: EmailProvider = emailProvider) {}

  async sendOrderConfirmation(
    input: SendOrderConfirmationInput,
  ): Promise<OrderNotificationResult> {
    const message = buildOrderConfirmationEmail(input);

    try {
      const delivery = await this.provider.send(message);

      logger.info(
        {
          orderId: input.order.id,
          orderNumber: input.order.orderNumber,
          messageId: delivery.messageId,
        },
        "Order confirmation email sent",
      );

      return {
        delivered: true,
        messageId: delivery.messageId,
      };
    } catch (error) {
      logger.error(
        {
          error,
          orderId: input.order.id,
          orderNumber: input.order.orderNumber,
        },
        "Order confirmation email delivery failed",
      );

      return {
        delivered: false,
        messageId: null,
      };
    }
  }
}

export const orderNotificationService = new OrderNotificationService();
