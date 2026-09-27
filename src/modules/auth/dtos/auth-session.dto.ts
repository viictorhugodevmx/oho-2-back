import type { PublicUserDto } from "./user.dto.js";

export interface AuthResponseDto {
  user: PublicUserDto;
  accessToken: string;
}

export interface CreatedAuthSession {
  response: AuthResponseDto;
  refreshToken: string;
  refreshExpiresAt: Date;
}
