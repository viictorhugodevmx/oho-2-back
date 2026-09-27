import type { CreatedAuthSession } from "../dtos/auth-session.dto.js";
import type { PublicUserDto } from "../dtos/user.dto.js";
import { refreshSessionRepository } from "../repositories/refresh-session.repository.js";
import { tokenService } from "./token.service.js";

interface CreateAuthSessionInput {
  user: PublicUserDto;
  userAgent?: string;
  ipAddress?: string;
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

export const authSessionService = {
  async create(input: CreateAuthSessionInput): Promise<CreatedAuthSession> {
    const accessToken = await tokenService.issueAccessToken({
      userId: input.user.id,
      role: input.user.role,
    });

    const refreshToken = tokenService.createRefreshToken();
    const tokenHash = tokenService.hashRefreshToken(refreshToken);
    const refreshExpiresAt = tokenService.getRefreshExpirationDate();

    await refreshSessionRepository.create({
      userId: input.user.id,
      tokenHash,
      expiresAt: refreshExpiresAt,
      userAgent: normalizeMetadata(input.userAgent, 500),
      ipAddress: normalizeMetadata(input.ipAddress, 64),
    });

    return {
      response: {
        user: input.user,
        accessToken,
      },
      refreshToken,
      refreshExpiresAt,
    };
  },
};
