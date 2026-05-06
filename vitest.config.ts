import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      NO_COLOR: "1",
    },
    include: ["src/**/*.test.ts", "config/eslint/*.test.js"],
    setupFiles: ["./src/testSetup.ts"],
  },
});
