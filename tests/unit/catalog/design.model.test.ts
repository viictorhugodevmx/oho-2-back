import { describe, expect, it } from "vitest";

import { DesignModel } from "../../../src/modules/catalog/models/design.model.js";

function createValidDesign() {
  return new DesignModel({
    externalId: "design-test-001",
    slug: "after-hours-test",
    title: "After Hours Test",
    description: "Diseño utilizado para validar el modelo persistente.",
    category: "backstage",
    imageUrl: "https://example.com/design.jpg",
    photographer: "OHO Test",
    photographerUrl: "https://example.com/photographer",
    featured: true,
    active: true,
    drop: "TEST DROP",
    tags: ["backstage", "night"],
  });
}

describe("DesignModel", () => {
  it("accepts a valid design", async () => {
    const design = createValidDesign();

    await expect(design.validate()).resolves.toBeUndefined();

    expect(design.slug).toBe("after-hours-test");
    expect(design.tags).toHaveLength(2);
  });

  it("rejects an invalid slug", async () => {
    const design = createValidDesign();

    design.slug = "Diseño con espacios";

    await expect(design.validate()).rejects.toThrow("Path `slug` is invalid");
  });

  it("rejects an invalid image URL", async () => {
    const design = createValidDesign();

    design.imageUrl = "not-a-url";

    await expect(design.validate()).rejects.toThrow(
      "imageUrl must be a valid URL",
    );
  });

  it("rejects an empty tags collection", async () => {
    const design = createValidDesign();

    design.tags.splice(0, design.tags.length);

    await expect(design.validate()).rejects.toThrow(
      "A design must contain at least one tag",
    );
  });
});
