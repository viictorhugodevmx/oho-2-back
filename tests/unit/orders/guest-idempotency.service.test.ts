import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { idempotencyRepository } from "../../../src/modules/orders/repositories/idempotency.repository.js";
import type { CreateOrderBody } from "../../../src/modules/orders/schemas/order.schemas.js";
import { idempotencyService } from "../../../src/modules/orders/services/idempotency.service.js";

const request: CreateOrderBody = {
  quoteId: "d831aa77-9303-42f6-b9d7-b61b90d59b3f",
  contact: {
    fullName: "Cliente Invitado",
    email: "invitado@example.com",
    phone: "+52 961 123 4567",
  },
  shippingAddress: {
    addressLine1: "Avenida Central 123",
    city: "Tuxtla Gutiérrez",
    state: "Chiapas",
    postalCode: "29000",
    country: "México",
  },
};

describe("guest idempotency", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adquiere una clave invitada almacenando solamente hashes", async () => {
    const recordId = new Types.ObjectId();

    const createProcessing = vi
      .spyOn(idempotencyRepository, "createProcessing")
      .mockResolvedValue({
        _id: recordId,
      } as never);

    const result = await idempotencyService.claimForGuest(
      {
        guestSessionHash: "a".repeat(64),
        key: "checkout-guest-001",
        request,
      },
      new Date("2026-10-07T18:00:00.000Z"),
    );

    expect(result).toEqual({
      status: "acquired",
      recordId,
    });

    const storedRecord = createProcessing.mock.calls[0]?.[0];

    expect(storedRecord?.operation).toBe("create_guest_order");
    expect(storedRecord?.keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedRecord?.requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(storedRecord?.keyHash).not.toContain("checkout-guest-001");
  });

  it("aísla la misma clave entre sesiones invitadas", async () => {
    vi.spyOn(idempotencyRepository, "createProcessing").mockResolvedValue({
      _id: new Types.ObjectId(),
    } as never);

    await idempotencyService.claimForGuest({
      guestSessionHash: "a".repeat(64),
      key: "checkout-guest-001",
      request,
    });

    await idempotencyService.claimForGuest({
      guestSessionHash: "b".repeat(64),
      key: "checkout-guest-001",
      request,
    });

    const calls = vi.mocked(idempotencyRepository.createProcessing).mock.calls;

    expect(calls[0]?.[0].keyHash).not.toBe(calls[1]?.[0].keyHash);
  });
});
