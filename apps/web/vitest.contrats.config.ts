import { defineConfig } from "vitest/config";

// Tests de contrat : appels RÉELS aux API tierces, lecture seule.
// Workflow `contrats` chaque nuit, jamais `make test`.
export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./", import.meta.url).pathname,
      // Hors de Next, « server-only » lèverait à l'import.
      "server-only": new URL("./tests/vide.ts", import.meta.url).pathname,
    },
  },
  test: { environment: "node", include: ["contrats/**/*.test.ts"], testTimeout: 60_000 },
});
