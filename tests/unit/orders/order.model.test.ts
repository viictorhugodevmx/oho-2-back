import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { OrderModel } from "../../../src/modules/orders/models/order.model.js";

function createValidOrder() {
  return new OrderModel({
    orderNumber: "OHO-88691263-G6DJ",
    customerType: "guest",
    contact: {
      firstName: "Víctor",
      lastName: "Segundo Aguilar",
      email: "CLIENTE@EXAMPLE.COM",
      phone: "4433065417",
    },
    shippingAddress: {
      addressLine1: "José María Rojo 160",
      neighborhood: "Moctezuma",
      city: "Morelia",
      state: "Michoacán",
      postalCode: "58030",
      country: "México",
      references: "Portón negro",
    },
    items: [
      {
        productId: new Types.ObjectId(),
        productExternalId: "product-poster-archive",
        productSlug: "poster-archive",
        productName: "Póster Archive",
        designId: new Types.ObjectId(),
        designExternalId: "design-concrete-flow",
        designSlug: "concrete-flow",
        designTitle: "Concrete Flow",
        format: "standard",
        quantity: 1,
        unitPriceCents: 24900,
        lineTotalCents: 24900,
        previewImageUrl:
          "https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg",
      },
    ],
    subtotalCents: 24900,
    shippingCents: 14900,
    totalCents: 39800,
  });
}

describe("OrderModel", () => {
  it("crea una orden invitada con estados iniciales", () => {
    const order = createValidOrder();

    expect(order.currency).toBe("MXN");
    expect(order.status).toBe("pending");
    expect(order.paymentStatus).toBe("pending");
    expect(order.fulfillmentStatus).toBe("pending");
    expect(order.contact.email).toBe("cliente@example.com");
    expect(order.userId).toBeNull();
  });

  it("permite una orden de cuenta cuando tiene usuario", () => {
    const order = createValidOrder();

    order.customerType = "account";
    order.userId = new Types.ObjectId();

    expect(order.validateSync()).toBeUndefined();
  });

  it("requiere usuario cuando la compra pertenece a una cuenta", () => {
    const order = createValidOrder();

    order.customerType = "account";

    const validationError = order.validateSync();

    expect(validationError?.errors.userId).toBeDefined();
  });

  it("rechaza pedidos sin productos", () => {
    const order = createValidOrder();

    order.items.splice(0, order.items.length);

    const validationError = order.validateSync();

    expect(validationError?.errors.items).toBeDefined();
  });
});
