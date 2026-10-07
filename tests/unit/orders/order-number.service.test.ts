import { describe, expect, it } from "vitest";

import { orderNumberService } from "../../../src/modules/orders/services/order-number.service.js";

describe("orderNumberService", () => {
  it("genera un folio con fecha UTC y sección aleatoria", () => {
    const orderNumber = orderNumberService.create(
      new Date("2026-10-07T18:00:00.000Z"),
    );

    expect(orderNumber).toMatch(/^OHO-20261007-[A-F0-9]{8}$/);
  });

  it("genera folios distintos para intentos independientes", () => {
    const currentDate = new Date("2026-10-07T18:00:00.000Z");

    const firstOrderNumber = orderNumberService.create(currentDate);
    const secondOrderNumber = orderNumberService.create(currentDate);

    expect(firstOrderNumber).not.toBe(secondOrderNumber);
  });
});
