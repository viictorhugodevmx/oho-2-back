import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { idempotencyRepository } from "../../../src/modules/orders/repositories/idempotency.repository.js";
import { idempotencyService } from "../../../src/modules/orders/services/idempotency.service.js";
import type { IdempotencyError } from "../../../src/modules/orders/services/idempotency.service.js";
import type { CreateOrderBody } from "../../../src/modules/orders/schemas/order.schemas.js";

vi.mock(
  "../../../src/modules/orders/repositories/idempotency.repository.js",
  () => ({
    idempotencyRepository: {
      createProcessing: vi.fn(),
      findByOperationAndKeyHash: vi.fn(),
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
    },
  }),
);

const request: CreateOrderBody = {
  quoteId: "8be2631b-5bed-4fa8-a717-6cc2814075ca",
  contact: {
    fullName: "Víctor Hugo Segundo Aguilar",
    email: "victor@example.com",
    phone: "4433065417",
  },
  shippingAddress: {
    addressLine1: "José María Rojo 160",
    neighborhood: "Moctezuma",
    city: "Morelia",
    state: "Michoacán",
    postalCode: "58030",
    country: "México",
  },
};

describe("idempotencyService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adquiere una clave nueva almacenando solamente hashes", async () => {
    const recordId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    vi.mocked(idempotencyRepository.createProcessing).mockResolvedValue({
      _id: recordId,
    } as never);

    const result = await idempotencyService.claimForAccount(
      {
        userId,
        key: "checkout-1234567890",
        request,
      },
      new Date("2026-10-07T18:00:00.000Z"),
    );

    expect(result).toEqual({
      status: "acquired",
      recordId,
    });

    const persistedRecord = vi.mocked(idempotencyRepository.createProcessing)
      .mock.calls[0]?.[0];

    expect(persistedRecord?.keyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persistedRecord?.requestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persistedRecord?.keyHash).not.toContain("checkout-1234567890");
    expect(persistedRecord?.expiresAt.toISOString()).toBe(
      "2026-10-08T18:00:00.000Z",
    );
  });

  it("recupera el pedido completado para la misma solicitud", async () => {
    const recordId = new Types.ObjectId();
    const orderId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    vi.mocked(idempotencyRepository.createProcessing).mockResolvedValueOnce({
      _id: recordId,
    } as never);

    await idempotencyService.claimForAccount({
      userId,
      key: "checkout-1234567890",
      request,
    });

    const requestHash = vi.mocked(idempotencyRepository.createProcessing).mock
      .calls[0]?.[0].requestHash;

    vi.mocked(idempotencyRepository.createProcessing).mockRejectedValueOnce({
      code: 11000,
    });

    vi.mocked(
      idempotencyRepository.findByOperationAndKeyHash,
    ).mockResolvedValue({
      requestHash,
      status: "completed",
      orderId,
      responseStatusCode: 201,
    } as never);

    const result = await idempotencyService.claimForAccount({
      userId,
      key: "checkout-1234567890",
      request,
    });

    expect(result).toEqual({
      status: "replay",
      orderId,
      responseStatusCode: 201,
    });
  });

  it("rechaza reutilizar la clave con otra solicitud", async () => {
    vi.mocked(idempotencyRepository.createProcessing).mockRejectedValue({
      code: 11000,
    });

    vi.mocked(
      idempotencyRepository.findByOperationAndKeyHash,
    ).mockResolvedValue({
      requestHash: "otro-hash",
      status: "completed",
      orderId: new Types.ObjectId(),
      responseStatusCode: 201,
    } as never);

    await expect(
      idempotencyService.claimForAccount({
        userId: new Types.ObjectId(),
        key: "checkout-1234567890",
        request,
      }),
    ).rejects.toMatchObject<Partial<IdempotencyError>>({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });

  it("informa cuando la solicitud sigue procesándose", async () => {
    const recordId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    vi.mocked(idempotencyRepository.createProcessing).mockResolvedValueOnce({
      _id: recordId,
    } as never);

    await idempotencyService.claimForAccount({
      userId,
      key: "checkout-1234567890",
      request,
    });

    const requestHash = vi.mocked(idempotencyRepository.createProcessing).mock
      .calls[0]?.[0].requestHash;

    vi.mocked(idempotencyRepository.createProcessing).mockRejectedValueOnce({
      code: 11000,
    });

    vi.mocked(
      idempotencyRepository.findByOperationAndKeyHash,
    ).mockResolvedValue({
      requestHash,
      status: "processing",
      orderId: null,
    } as never);

    await expect(
      idempotencyService.claimForAccount({
        userId,
        key: "checkout-1234567890",
        request,
      }),
    ).rejects.toMatchObject<Partial<IdempotencyError>>({
      code: "IDEMPOTENCY_IN_PROGRESS",
    });
  });
});
