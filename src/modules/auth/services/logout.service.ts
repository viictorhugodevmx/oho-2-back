import { refreshSessionRepository } from "../repositories/refresh-session.repository.js";
import { tokenService } from "./token.service.js";

export const logoutService = {
  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }

    const tokenHash = tokenService.hashRefreshToken(refreshToken);

    await refreshSessionRepository.revokeByTokenHash(tokenHash, new Date());
  },
};
