import { describe, expect, it } from "vitest";

import type { OrderDto } from "../../../src/modules/orders/dtos/order.dto.js";
import { buildOrderConfirmationEmail } from "../../../src/modules/notifications/templates/order-confirmation.template.js";

const order: OrderDto = {
  id: "507f1f77bcf86cd799439012",
  orderNumber: "OHO-20261007-A1B2C3D4",
  quoteId: "d831aa77-9303-42f6-b9d7-b61b90d59b3f",
  customerType: "guest",
  contact: {
    fullName: "Cliente <OHO>",
    email: "cliente@example.com",
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
      basePriceCents: 84900,
      unitPriceCents: 84900,
      lineTotalCents: 84900,
    },
  ],
  currency: "MXN",
  subtotalCents: 84900,
  shippingCents: 14900,
  totalCents: 99800,
  status: "pending",
  paymentStatus: "pending",
  fulfillmentStatus: "pending",
  createdAt: "2026-10-07T18:00:00.000Z",
  updatedAt: "2026-10-07T18:00:00.000Z",
};

describe("buildOrderConfirmationEmail", () => {
  it("construye el correo con artículos, totales y dirección", () => {
    const email = buildOrderConfirmationEmail({
      order,
    });

    expect(email.to).toBe("cliente@example.com");

    expect(email.subject).toContain(order.orderNumber);

    expect(email.text).toContain("Hoodie After Hours + Front Row Pressure");

    expect(email.text).toContain("$998.00");

    expect(email.html).toContain("Cliente &lt;OHO&gt;");

    expect(email.html).not.toContain("Cliente <OHO>");
  });

  it("crea un enlace de cuenta sin token", () => {
    const email = buildOrderConfirmationEmail({
      order: {
        ...order,
        customerType: "account",
      },
    });

    expect(email.text).toContain(`/orders/${order.orderNumber}`);

    expect(email.text).not.toContain("#token=");
  });

  it("transporta el token invitado en el fragmento de la URL", () => {
    const guestAccessToken = "A".repeat(43);

    const email = buildOrderConfirmationEmail({
      order,
      guestAccessToken,
    });

    expect(email.text).toContain(
      `/orders/${order.orderNumber}#token=${guestAccessToken}`,
    );

    expect(email.text).not.toContain("?token=");

    expect(email.html).toContain("#token=");
  });
});
