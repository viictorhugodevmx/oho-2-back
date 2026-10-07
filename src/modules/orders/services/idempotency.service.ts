import { createHash } from "node:crypto";

import type { Types } from "mongoose";

import type { IdempotencyOperation } from "../models/idempotency-record.model.js";
import { idempotencyRepository } from "../repositories/idempotency.repository.js";
import type { CreateOrderBody } from "../schemas/order.schemas.js";

const IDEMPOTENCY_TTL_HOURS = 24;

export type IdempotencyErrorCode =
  "IDEMPOTENCY_CONFLICT" | "IDEMPOTENCY_IN_PROGRESS";

export class IdempotencyError extends Error {
  constructor(
    public readonly code: IdempotencyErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "IdempotencyError";
  }
}

interface AccountIdempotencyInput {
  userId: Types.ObjectId;
  key: string;
  request: CreateOrderBody;
}

interface GuestIdempotencyInput {
  guestSessionHash: string;
  key: string;
  request: CreateOrderBody;
}

interface ClaimInput {
  operation: IdempotencyOperation;
  keyHash: string;
  request: CreateOrderBody;
}

export type IdempotencyClaim =
  | {
      status: "acquired";
      recordId: Types.ObjectId;
    }
  | {
      status: "replay";
      orderId: Types.ObjectId;
      responseStatusCode: number;
    };

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, nestedValue]) => nestedValue !== undefined)
        .sort(([firstKey], [secondKey]) => firstKey.localeCompare(secondKey))
        .map(([key, nestedValue]) => [key, canonicalize(nestedValue)]),
    );
  }

  return value;
}

function hashRequest(request: CreateOrderBody): string {
  return hash(JSON.stringify(canonicalize(request)));
}

function hashAccountKey(userId: Types.ObjectId, key: string): string {
  return hash(`create_order:${userId.toString()}:${key}`);
}

function hashGuestKey(guestSessionHash: string, key: string): string {
  return hash(`create_guest_order:${guestSessionHash}:${key}`);
}

function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

async function claim(
  input: ClaimInput,
  currentDate: Date,
): Promise<IdempotencyClaim> {
  const requestHash = hashRequest(input.request);

  const expiresAt = new Date(
    currentDate.getTime() + IDEMPOTENCY_TTL_HOURS * 60 * 60 * 1_000,
  );

  try {
    const record = await idempotencyRepository.createProcessing({
      operation: input.operation,
      keyHash: input.keyHash,
      requestHash,
      lockedAt: currentDate,
      expiresAt,
    });

    return {
      status: "acquired",
      recordId: record._id,
    };
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  const existingRecord = await idempotencyRepository.findByOperationAndKeyHash(
    input.operation,
    input.keyHash,
  );

  if (!existingRecord) {
    throw new IdempotencyError(
      "IDEMPOTENCY_IN_PROGRESS",
      "El intento idempotente todavía se está procesando.",
    );
  }

  if (existingRecord.requestHash !== requestHash) {
    throw new IdempotencyError(
      "IDEMPOTENCY_CONFLICT",
      "La clave de idempotencia ya fue utilizada con otra solicitud.",
    );
  }

  if (existingRecord.status === "completed" && existingRecord.orderId) {
    return {
      status: "replay",
      orderId: existingRecord.orderId,
      responseStatusCode: existingRecord.responseStatusCode ?? 201,
    };
  }

  if (existingRecord.status === "processing") {
    throw new IdempotencyError(
      "IDEMPOTENCY_IN_PROGRESS",
      "La creación del pedido todavía se está procesando.",
    );
  }

  throw new IdempotencyError(
    "IDEMPOTENCY_CONFLICT",
    "El intento anterior falló. Utiliza una nueva clave de idempotencia.",
  );
}

export const idempotencyService = {
  claimForAccount(
    input: AccountIdempotencyInput,
    currentDate = new Date(),
  ): Promise<IdempotencyClaim> {
    return claim(
      {
        operation: "create_order",
        keyHash: hashAccountKey(input.userId, input.key),
        request: input.request,
      },
      currentDate,
    );
  },

  claimForGuest(
    input: GuestIdempotencyInput,
    currentDate = new Date(),
  ): Promise<IdempotencyClaim> {
    return claim(
      {
        operation: "create_guest_order",
        keyHash: hashGuestKey(input.guestSessionHash, input.key),
        request: input.request,
      },
      currentDate,
    );
  },

  complete(
    recordId: Types.ObjectId,
    orderId: Types.ObjectId,
    currentDate = new Date(),
  ) {
    return idempotencyRepository.markCompleted(
      recordId,
      orderId,
      201,
      currentDate,
    );
  },

  fail(recordId: Types.ObjectId, errorCode: string, currentDate = new Date()) {
    return idempotencyRepository.markFailed(recordId, errorCode, currentDate);
  },
};
