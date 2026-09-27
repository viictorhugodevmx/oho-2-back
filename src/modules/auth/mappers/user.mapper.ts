import type { Types } from "mongoose";

import type { PublicUserDto } from "../dtos/user.dto.js";
import type { User } from "../models/user.model.js";

type PublicUserSource = Pick<
  User,
  "firstName" | "lastName" | "email" | "role" | "createdAt"
> & {
  _id: Types.ObjectId;
};

export function mapUserToPublicDto(user: PublicUserSource): PublicUserDto {
  return {
    id: user._id.toString(),
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}
