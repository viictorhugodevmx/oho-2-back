import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/catalog/services/product.service.js", () => ({
  productService: {
    list: vi.fn(),
    findBySlug: vi.fn(),
  },
}));

import { createApp } from "../../src/app.js";
import { productService } from "../../src/modules/catalog/services/product.service.js";

describe("Products API", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista los productos activos", async () => {
    vi.mocked(productService.list).mockResolvedValue([]);

    const response = await request(app).get("/api/v1/products");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [],
      meta: {
        total: 0,
        filters: {
          sort: "featured",
        },
      },
    });

    expect(productService.list).toHaveBeenCalledWith({
      sort: "featured",
    });
  });

  it("convierte los filtros válidos antes de enviarlos al servicio", async () => {
    vi.mocked(productService.list).mockResolvedValue([]);

    const response = await request(app).get(
      "/api/v1/products?category=apparel&featured=true&sort=price-asc",
    );

    expect(response.status).toBe(200);
    expect(productService.list).toHaveBeenCalledWith({
      category: "apparel",
      featured: true,
      sort: "price-asc",
    });
  });

  it("rechaza filtros inválidos", async () => {
    const response = await request(app).get(
      "/api/v1/products?category=inexistente",
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(productService.list).not.toHaveBeenCalled();
  });

  it("obtiene un producto activo mediante su slug", async () => {
    vi.mocked(productService.findBySlug).mockResolvedValue({
      slug: "hoodie-after-hours",
    } as never);

    const response = await request(app).get(
      "/api/v1/products/hoodie-after-hours",
    );

    expect(response.status).toBe(200);
    expect(response.body.data.slug).toBe("hoodie-after-hours");
    expect(productService.findBySlug).toHaveBeenCalledWith(
      "hoodie-after-hours",
    );
  });

  it("devuelve 404 cuando el producto no existe", async () => {
    vi.mocked(productService.findBySlug).mockResolvedValue(null);

    const response = await request(app).get(
      "/api/v1/products/producto-inexistente",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "PRODUCT_NOT_FOUND",
        message: "Product was not found.",
        details: [],
      },
    });
  });

  it("rechaza slugs con formato inválido", async () => {
    const response = await request(app).get("/api/v1/products/SLUG_INVALIDO");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(productService.findBySlug).not.toHaveBeenCalled();
  });
});
