import { describe, expect, it } from "vitest";
import { designSeeds } from "../../../src/database/seeds/design.seed-data.js";
import { productSeeds } from "../../../src/database/seeds/product.seed-data.js";
import {
  mapDesignToDto,
  mapProductToDto,
} from "../../../src/modules/catalog/mappers/catalog.mapper.js";
import { DesignModel } from "../../../src/modules/catalog/models/design.model.js";
import { ProductModel } from "../../../src/modules/catalog/models/product.model.js";

describe("catalog mappers", () => {
  it("transforma un producto al contrato público", () => {
    const seed = productSeeds[0];

    if (!seed) {
      throw new Error("Product seed is required");
    }

    const product = new ProductModel(seed);
    const dto = mapProductToDto(product.toObject());

    expect(dto.id).toBe("product-001");
    expect(dto.basePriceCents).toBe(44900);
    expect(dto.formats).toHaveLength(3);
    expect(dto.options).toHaveLength(2);
  });

  it("no expone datos internos del producto", () => {
    const seed = productSeeds[0];

    if (!seed) {
      throw new Error("Product seed is required");
    }

    const product = new ProductModel(seed);
    const dto = mapProductToDto(product.toObject());

    expect(dto).not.toHaveProperty("_id");
    expect(dto).not.toHaveProperty("externalId");
    expect(dto).not.toHaveProperty("active");
    expect(dto).not.toHaveProperty("printProviderProductId");
    expect(dto).not.toHaveProperty("createdAt");
    expect(dto).not.toHaveProperty("updatedAt");
  });

  it("transforma un diseño al contrato público", () => {
    const seed = designSeeds[0];

    if (!seed) {
      throw new Error("Design seed is required");
    }

    const design = new DesignModel(seed);
    const dto = mapDesignToDto(design.toObject());

    expect(dto.id).toBe("design-001");
    expect(dto.slug).toBe("after-hours");
    expect(dto.tags).toEqual(["backstage", "red light", "night"]);
  });

  it("no expone datos internos del diseño", () => {
    const seed = designSeeds[0];

    if (!seed) {
      throw new Error("Design seed is required");
    }

    const design = new DesignModel(seed);
    const dto = mapDesignToDto(design.toObject());

    expect(dto).not.toHaveProperty("_id");
    expect(dto).not.toHaveProperty("externalId");
    expect(dto).not.toHaveProperty("active");
    expect(dto).not.toHaveProperty("printProviderFileId");
    expect(dto).not.toHaveProperty("createdAt");
    expect(dto).not.toHaveProperty("updatedAt");
  });
});
