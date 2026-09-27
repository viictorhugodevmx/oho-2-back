import { Router } from "express";

import { getCurrentUser } from "../controllers/current-user.controller.js";
import { login } from "../controllers/login.controller.js";
import { logout } from "../controllers/logout.controller.js";
import { refresh } from "../controllers/refresh.controller.js";
import { register } from "../controllers/register.controller.js";
import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
} from "../middlewares/auth-rate-limit.js";
import { authenticate } from "../middlewares/authenticate.js";

export const authRouter = Router();

authRouter.post("/register", registerRateLimiter, register);

authRouter.post("/login", loginRateLimiter, login);

authRouter.post("/refresh", refreshRateLimiter, refresh);

authRouter.post("/logout", logout);

authRouter.get("/me", authenticate, getCurrentUser);
