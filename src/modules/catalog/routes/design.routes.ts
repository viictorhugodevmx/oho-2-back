import { Router } from "express";

import {
  getDesignBySlug,
  listDesigns,
} from "../controllers/design.controller.js";

export const designRouter = Router();

designRouter.get("/", listDesigns);
designRouter.get("/:slug", getDesignBySlug);
