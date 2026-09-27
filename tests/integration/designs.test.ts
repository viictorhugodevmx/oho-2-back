import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/modules/catalog/services/design.service.js", () => ({
  designService: {
    list: vi.fn(),
    findBySlug: vi.fn(),
  },
}));

import { createApp } from "../../src/app.js";
import { designService } from "../../src/modules/catalog/services/design.service.js";

describe("Designs API", () => {
  const app = createApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista los diseños activos", async () => {
    vi.mocked(designService.list).mockResolvedValue([]);

    const response = await request(app).get("/api/v1/designs");

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

    expect(designService.list).toHaveBeenCalledWith({
      sort: "featured",
    });
  });

  it("convierte los filtros válidos antes de enviarlos al servicio", async () => {
    vi.mocked(designService.list).mockResolvedValue([]);

    const response = await request(app).get(
      "/api/v1/designs?category=concert&featured=true&sort=title",
    );

    expect(response.status).toBe(200);
    expect(designService.list).toHaveBeenCalledWith({
      category: "concert",
      featured: true,
      sort: "title",
    });
  });

  it("rechaza filtros inválidos", async () => {
    const response = await request(app).get(
      "/api/v1/designs?category=inexistente",
    );

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(designService.list).not.toHaveBeenCalled();
  });

  it("obtiene un diseño activo mediante su slug", async () => {
    vi.mocked(designService.findBySlug).mockResolvedValue({
      slug: "after-hours",
    } as never);

    const response = await request(app).get("/api/v1/designs/after-hours");

    expect(response.status).toBe(200);
    expect(response.body.data.slug).toBe("after-hours");
    expect(designService.findBySlug).toHaveBeenCalledWith("after-hours");
  });

  it("devuelve 404 cuando el diseño no existe", async () => {
    vi.mocked(designService.findBySlug).mockResolvedValue(null);

    const response = await request(app).get(
      "/api/v1/designs/diseno-inexistente",
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: "DESIGN_NOT_FOUND",
        message: "Design was not found.",
        details: [],
      },
    });
  });

  it("rechaza slugs con formato inválido", async () => {
    const response = await request(app).get("/api/v1/designs/SLUG_INVALIDO");

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(designService.findBySlug).not.toHaveBeenCalled();
  });
});
