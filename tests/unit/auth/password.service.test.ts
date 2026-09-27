import { describe, expect, it } from "vitest";

import { passwordService } from "../../../src/modules/auth/services/password.service.js";

describe("passwordService", () => {
  it("verifica la contraseña correcta sin almacenarla en texto plano", async () => {
    const password = "OhoDemo20";
    const passwordHash = await passwordService.hash(password);

    expect(passwordHash).not.toBe(password);
    expect(passwordHash).toMatch(/^\$2[aby]\$12\$/);
    await expect(passwordService.verify(password, passwordHash)).resolves.toBe(
      true,
    );
    await expect(
      passwordService.verify("OtraContrasena20", passwordHash),
    ).resolves.toBe(false);
  });

  it("rechaza contraseñas que bcrypt recortaría", async () => {
    const password = "🔒".repeat(19);
    const passwordHash = await passwordService.hash("OhoDemo20");

    await expect(passwordService.hash(password)).rejects.toThrow(
      "Password exceeds the bcrypt 72-byte limit.",
    );
    await expect(passwordService.verify(password, passwordHash)).resolves.toBe(
      false,
    );
  });
});
