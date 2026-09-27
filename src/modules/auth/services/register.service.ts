import { mapUserToPublicDto } from "../mappers/user.mapper.js";
import { authRepository } from "../repositories/auth.repository.js";
import type { RegisterInput } from "../schemas/register.schema.js";
import { passwordService } from "./password.service.js";

export class EmailAlreadyRegisteredError extends Error {
  readonly code = "EMAIL_ALREADY_REGISTERED";

  constructor() {
    super("Ya existe una cuenta registrada con ese correo.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

function splitFullName(name: string): {
  firstName: string;
  lastName: string;
} {
  const separatorIndex = name.indexOf(" ");

  return {
    firstName: name.slice(0, separatorIndex),
    lastName: name.slice(separatorIndex + 1),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export const registerService = {
  async register(input: RegisterInput) {
    const existingUser = await authRepository.findByEmail(input.email);

    if (existingUser) {
      throw new EmailAlreadyRegisteredError();
    }

    const { firstName, lastName } = splitFullName(input.name);
    const passwordHash = await passwordService.hash(input.password);

    try {
      const user = await authRepository.createCustomer({
        firstName,
        lastName,
        email: input.email,
        passwordHash,
      });

      return mapUserToPublicDto(user);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new EmailAlreadyRegisteredError();
      }

      throw error;
    }
  },
};
