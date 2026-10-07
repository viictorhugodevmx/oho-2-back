import { z } from "zod";

export const IDEMPOTENCY_KEY_HEADER = "idempotency-key";

const orderNumberPattern = /^OHO-[A-Z0-9]+(?:-[A-Z0-9]+)+$/;

const idempotencyKeyPattern = /^[A-Za-z0-9._:-]+$/;

const phonePattern = /^[0-9+()\-\s]{7,20}$/;

const optionalText = (maximumLength: number) =>
  z.string().trim().max(maximumLength).optional();

export const idempotencyKeySchema = z
  .string()
  .trim()
  .min(16)
  .max(160)
  .regex(idempotencyKeyPattern);

export const createOrderBodySchema = z
  .object({
    quoteId: z.string().trim().uuid(),
    contact: z
      .object({
        fullName: z.string().trim().min(2).max(160),
        email: z.string().trim().toLowerCase().email().max(254),
        phone: z.string().trim().regex(phonePattern),
      })
      .strict(),
    shippingAddress: z
      .object({
        addressLine1: z.string().trim().min(4).max(200),
        addressLine2: optionalText(200),
        neighborhood: optionalText(120),
        city: z.string().trim().min(2).max(120),
        state: z.string().trim().min(2).max(120),
        postalCode: z.string().trim().min(4).max(12),
        country: z.string().trim().min(2).max(80),
        references: optionalText(500),
      })
      .strict(),
  })
  .strict();

export const orderNumberParamsSchema = z
  .object({
    orderNumber: z
      .string()
      .trim()
      .toUpperCase()
      .max(80)
      .regex(orderNumberPattern),
  })
  .strict();

export type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export type OrderNumberParams = z.infer<typeof orderNumberParamsSchema>;
