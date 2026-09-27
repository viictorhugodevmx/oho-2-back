import type { UserRole } from "../models/user.model.js";

export interface PublicUserDto {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}
