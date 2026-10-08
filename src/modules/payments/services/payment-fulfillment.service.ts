import type { Types } from "mongoose";

import { orderRepository } from "../../orders/repositories/order.repository.js";
import { printProvider } from "../../../providers/print/simulated-print.provider.js";

export class PaymentFulfillmentError extends Error {
  readonly code = "PAYMENT_ORDER_NOT_FOUND";

  constructor() {
    super("No se encontró el pedido asociado al pago.");

    this.name = "PaymentFulfillmentError";
  }
}

export const paymentFulfillmentService = {
  async completePaidOrder(
    orderId: Types.ObjectId,
    currentDate = new Date(),
  ): Promise<void> {
    let order = await orderRepository.findById(orderId);

    if (!order) {
      throw new PaymentFulfillmentError();
    }

    if (order.paymentStatus !== "paid") {
      const updatedOrder = await orderRepository.markPaidAndConfirmed(
        orderId,
        currentDate,
      );

      if (updatedOrder) {
        order = updatedOrder;
      } else {
        order = await orderRepository.findById(orderId);

        if (!order) {
          throw new PaymentFulfillmentError();
        }
      }
    }

    if (
      order.fulfillmentStatus === "submitted" ||
      order.fulfillmentStatus === "in_production" ||
      order.fulfillmentStatus === "shipped" ||
      order.fulfillmentStatus === "delivered"
    ) {
      return;
    }

    const submission = await printProvider.submitOrder({
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      items: order.items.map((item) => ({
        productId: item.productExternalId,
        designId: item.designExternalId,
        format: item.format,
        quantity: item.quantity,
        printProviderProductId: item.printProviderProductId ?? null,
        printProviderFileId: item.printProviderFileId ?? null,
      })),
      submittedAt: currentDate,
    });

    await orderRepository.markFulfillmentSubmitted(
      orderId,
      submission.reference,
      submission.submittedAt,
    );
  },
};
