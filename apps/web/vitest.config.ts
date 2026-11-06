import { defineVitestProject } from "@nuxt/test-utils/config";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
      "#shared": new URL("./shared", import.meta.url).pathname,
    },
  },
  test: {
    fileParallelism: false,
    projects: [
      {
        extends: true,
        test: {
          name: "units",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          setupFiles: ["tests/preparation.ts"],
        },
      },
      await defineVitestProject({
        test: {
          name: "components",
          environment: "nuxt",
          include: ["app/components/**/tests/**/*.test.ts"],
        },
      }),
    ],
  },
});
