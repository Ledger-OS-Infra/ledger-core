import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["nomba/__tests__/**/*.test.ts"],
  },
});
