import { Router } from "express";

import {
  getProductBySlug,
  listProducts,
} from "../controllers/product.controller.js";

export const productRouter = Router();

productRouter.get("/", listProducts);
productRouter.get("/:slug", getProductBySlug);
