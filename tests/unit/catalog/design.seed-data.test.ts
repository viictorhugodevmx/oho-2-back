import { describe, expect, it } from "vitest";
import { designSeeds } from "../../../src/database/seeds/design.seed-data.js";

describe("designSeeds", () => {
  it("contiene los seis diseños del frontend", () => {
    expect(designSeeds).toHaveLength(6);
  });

  it("no repite externalId ni slug", () => {
    const externalIds = designSeeds.map((design) => design.externalId);
    const slugs = designSeeds.map((design) => design.slug);

    expect(new Set(externalIds).size).toBe(designSeeds.length);
    expect(new Set(slugs).size).toBe(designSeeds.length);
  });

  it("conserva autor, atribución y etiquetas", () => {
    for (const design of designSeeds) {
      expect(design.photographer).not.toHaveLength(0);
      expect(URL.canParse(design.photographerUrl)).toBe(true);
      expect(design.tags.length).toBeGreaterThan(0);
    }
  });

  it("utiliza imágenes válidas y mantiene proveedor pendiente", () => {
    for (const design of designSeeds) {
      expect(URL.canParse(design.imageUrl)).toBe(true);
      expect(design.printProviderFileId).toBeNull();
    }
  });
});
