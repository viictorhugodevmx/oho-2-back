import type { PublicUserDto } from "../dtos/user.dto.js";
import { mapUserToPublicDto } from "../mappers/user.mapper.js";
import { authRepository } from "../repositories/auth.repository.js";

export class AuthenticatedUserNotFoundError extends Error {
  readonly code = "UNAUTHORIZED";

  constructor() {
    super("La sesión ya no pertenece a una cuenta activa.");
    this.name = "AuthenticatedUserNotFoundError";
  }
}

export const currentUserService = {
  async getById(userId: string): Promise<PublicUserDto> {
    const user = await authRepository.findActiveById(userId);

    if (!user) {
      throw new AuthenticatedUserNotFoundError();
    }

    return mapUserToPublicDto(user);
  },
};
