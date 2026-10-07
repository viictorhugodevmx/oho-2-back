import { describe, expect, it } from "vitest";

import { createQuoteBodySchema } from "../../../src/modules/checkout/schemas/quote.schemas.js";

const validItem = {
  productSlug: "hoodie-after-hours",
  designSlug: "front-row-pressure",
  format: "standard",
  quantity: 2,
  selectedOptions: [
    {
      optionId: "size",
      valueId: "size-m",
    },
    {
      optionId: "color",
      valueId: "color-black",
    },
  ],
};

describe("createQuoteBodySchema", () => {
  it("acepta una solicitud de cotización válida", () => {
    const result = createQuoteBodySchema.safeParse({
      items: [validItem],
    });

    expect(result.success).toBe(true);
  });

  it("agrega una lista vacía cuando selectedOptions no está presente", () => {
    const result = createQuoteBodySchema.parse({
      items: [
        {
          productSlug: "poster-archive",
          designSlug: "after-hours",
          format: "large",
          quantity: 1,
        },
      ],
    });

    expect(result.items[0]?.selectedOptions).toEqual([]);
  });

  it("rechaza una cotización sin artículos", () => {
    const result = createQuoteBodySchema.safeParse({
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("rechaza cantidades fuera del límite permitido", () => {
    const result = createQuoteBodySchema.safeParse({
      items: [
        {
          ...validItem,
          quantity: 11,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rechaza formatos inexistentes", () => {
    const result = createQuoteBodySchema.safeParse({
      items: [
        {
          ...validItem,
          format: "gigantic",
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rechaza dos valores para la misma opción", () => {
    const result = createQuoteBodySchema.safeParse({
      items: [
        {
          ...validItem,
          selectedOptions: [
            {
              optionId: "size",
              valueId: "size-s",
            },
            {
              optionId: "size",
              valueId: "size-m",
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
