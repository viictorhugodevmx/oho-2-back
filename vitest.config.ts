import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    restoreMocks: true,
    env: {
      NODE_ENV: "test",
      FRONTEND_URL: "http://localhost:3000",
      LOG_LEVEL: "silent",
    },
  },
});
