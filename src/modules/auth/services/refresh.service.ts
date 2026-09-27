import type { CreatedAuthSession } from "../dtos/auth-session.dto.js";
import { mapUserToPublicDto } from "../mappers/user.mapper.js";
import { authRepository } from "../repositories/auth.repository.js";
import { refreshSessionRepository } from "../repositories/refresh-session.repository.js";
import { tokenService } from "./token.service.js";

interface RefreshInput {
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
}

export class InvalidRefreshTokenError extends Error {
  readonly code = "INVALID_REFRESH_TOKEN";

  constructor() {
    super("La sesión no es válida o ha expirado.");
    this.name = "InvalidRefreshTokenError";
  }
}

function normalizeMetadata(
  value: string | undefined,
  maximumLength: number,
): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maximumLength);
}

export const refreshService = {
  async rotate(input: RefreshInput): Promise<CreatedAuthSession> {
    const currentTokenHash = tokenService.hashRefreshToken(input.refreshToken);

    const currentSession =
      await refreshSessionRepository.findActiveByTokenHash(currentTokenHash);

    if (!currentSession) {
      throw new InvalidRefreshTokenError();
    }

    const user = await authRepository.findActiveById(
      currentSession.userId.toString(),
    );

    if (!user) {
      throw new InvalidRefreshTokenError();
    }

    const publicUser = mapUserToPublicDto(user);
    const accessToken = await tokenService.issueAccessToken({
      userId: publicUser.id,
      role: publicUser.role,
    });

    const nextRefreshToken = tokenService.createRefreshToken();
    const nextTokenHash = tokenService.hashRefreshToken(nextRefreshToken);
    const refreshExpiresAt = tokenService.getRefreshExpirationDate();

    const replacementSession = await refreshSessionRepository.create({
      userId: publicUser.id,
      tokenHash: nextTokenHash,
      expiresAt: refreshExpiresAt,
      userAgent: normalizeMetadata(input.userAgent, 500),
      ipAddress: normalizeMetadata(input.ipAddress, 64),
    });

    try {
      const rotation = await refreshSessionRepository.revokeAndReplace(
        currentSession._id,
        replacementSession._id,
        new Date(),
      );

      if (rotation.modifiedCount !== 1) {
        throw new InvalidRefreshTokenError();
      }
    } catch (error) {
      await refreshSessionRepository
        .deleteById(replacementSession._id)
        .catch(() => undefined);

      throw error;
    }

    return {
      response: {
        user: publicUser,
        accessToken,
      },
      refreshToken: nextRefreshToken,
      refreshExpiresAt,
    };
  },
};
