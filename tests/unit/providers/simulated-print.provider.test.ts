import { describe, expect, it } from "vitest";

import { SimulatedPrintProvider } from "../../../src/providers/print/simulated-print.provider.js";

const submittedAt = new Date("2026-10-07T20:45:00.000Z");

const input = {
  orderId: "507f1f77bcf86cd799439011",
  orderNumber: "OHO-20261007-A1B2C3D4",
  items: [
    {
      productId: "product-002",
      designId: "design-002",
      format: "standard",
      quantity: 1,
      printProviderProductId: null,
      printProviderFileId: null,
    },
  ],
  submittedAt,
};

describe("SimulatedPrintProvider", () => {
  it("registra el pedido como enviado a producción", async () => {
    const provider = new SimulatedPrintProvider();

    await expect(provider.submitOrder(input)).resolves.toEqual({
      provider: "simulated",
      reference: "SIM-OHO-20261007-A1B2C3D4",
      status: "submitted",
      submittedAt,
    });
  });

  it("genera una referencia estable para el mismo pedido", async () => {
    const provider = new SimulatedPrintProvider();

    const first = await provider.submitOrder(input);

    const second = await provider.submitOrder(input);

    expect(second.reference).toBe(first.reference);
  });

  it("no requiere identificadores de un proveedor real", async () => {
    const provider = new SimulatedPrintProvider();

    const result = await provider.submitOrder(input);

    expect(result.status).toBe("submitted");

    expect(input.items[0]?.printProviderProductId).toBeNull();

    expect(input.items[0]?.printProviderFileId).toBeNull();
  });
});
