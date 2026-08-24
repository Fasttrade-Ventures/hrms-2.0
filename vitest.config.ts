import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "packages/**/src/**/*.test.ts",
      "packages/**/src/**/*.spec.ts",
      "tests/**/*.test.ts",
    ],
    server: {
      deps: {
        inline: ["@supabase/ssr"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "apps/web/src"),
      "@hrms/domain": path.resolve(__dirname, "packages/domain/src/index.ts"),
      "@hrms/platform": path.resolve(__dirname, "packages/platform/src/index.ts"),
      "@hrms/testkit": path.resolve(__dirname, "packages/testkit/src/index.ts"),
      "@hrms/validation": path.resolve(__dirname, "packages/validation/src/index.ts"),
      "next/cache": path.resolve(__dirname, "tests/mocks/next-cache.ts"),
      "next/headers": path.resolve(__dirname, "tests/mocks/next-headers.ts"),
      "next/navigation": path.resolve(__dirname, "tests/mocks/next-navigation.ts"),
    },
  },
});
