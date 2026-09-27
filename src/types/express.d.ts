import type { AccessTokenUser } from "../modules/auth/services/token.service.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: AccessTokenUser;
  }
}

export {};
