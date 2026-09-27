import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export const passwordService = {
  async hash(password: string): Promise<string> {
    if (bcrypt.truncates(password)) {
      throw new Error("Password exceeds the bcrypt 72-byte limit.");
    }

    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async verify(password: string, passwordHash: string): Promise<boolean> {
    if (bcrypt.truncates(password)) {
      return false;
    }

    return bcrypt.compare(password, passwordHash);
  },
};
