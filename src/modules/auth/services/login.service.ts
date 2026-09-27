import { mapUserToPublicDto } from "../mappers/user.mapper.js";
import { authRepository } from "../repositories/auth.repository.js";
import type { LoginInput } from "../schemas/login.schema.js";
import { passwordService } from "./password.service.js";

const DUMMY_PASSWORD_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export class InvalidCredentialsError extends Error {
  readonly code = "INVALID_CREDENTIALS";

  constructor() {
    super("El correo o la contraseña son incorrectos.");
    this.name = "InvalidCredentialsError";
  }
}

export const loginService = {
  async login(input: LoginInput) {
    const user = await authRepository.findActiveByEmailWithPassword(
      input.email,
    );

    const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;

    const passwordMatches = await passwordService.verify(
      input.password,
      passwordHash,
    );

    if (!user || !passwordMatches) {
      throw new InvalidCredentialsError();
    }

    return mapUserToPublicDto(user);
  },
};
